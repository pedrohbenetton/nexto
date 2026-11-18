const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const providerRegistry = require('./providers/ProviderRegistry');
const {
  parseStartPayload,
  buildDeepLinkUrl,
  shouldTriggerAlert,
  formatTelegramMessage,
  formatAlertsListMessage
} = require('./radarCore');

const DATA_FILE = path.join(__dirname, 'data', 'radar_alerts.json');

class RadarAlertsService {
  constructor() {
    this.subscriptions = new Map();
    this.pollTimer = null;
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    this.botUsername = process.env.TELEGRAM_BOT_USERNAME || 'NextoRadarBot';
    this.appBaseUrl = process.env.NEXTO_APP_URL || 'https://nexto.app.br';
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.id) {
              this.subscriptions.set(item.id, item);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[RadarAlerts] Falha ao carregar inscrições salvas:', err.message);
    }
  }

  save() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.subscriptions.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[RadarAlerts] Falha ao persistir inscrições:', err.message);
    }
  }

  /**
   * Registra uma nova inscrição de alerta para monitoramento
   */
  subscribe({
    chatId,
    serviceId,
    stopId,
    stopName = 'Seu Ponto',
    lineCode = 'Linha',
    lineDestination = '',
    lineRoutesPath = '',
    leadMinutes = 8
  }) {
    if (!chatId || !serviceId || !stopId) {
      throw new Error('chatId, serviceId e stopId são obrigatórios');
    }

    // Procura se já existe inscrição idêntica ativa para o mesmo chatId
    for (const [id, sub] of this.subscriptions.entries()) {
      if (sub.chatId === String(chatId) && sub.serviceId === serviceId && sub.stopId === String(stopId)) {
        sub.active = true;
        sub.leadMinutes = leadMinutes;
        sub.stopName = stopName;
        sub.lineCode = lineCode;
        sub.lineDestination = lineDestination;
        sub.lineRoutesPath = lineRoutesPath;
        this.save();
        return sub;
      }
    }

    const id = `sub_${crypto.randomUUID().slice(0, 8)}`;
    const sub = {
      id,
      chatId: String(chatId),
      serviceId,
      stopId: String(stopId),
      stopName,
      lineCode,
      lineDestination,
      lineRoutesPath,
      leadMinutes: Math.max(1, Math.min(30, leadMinutes)),
      createdAt: new Date().toISOString(),
      lastNotifiedVehicleId: null,
      lastNotifiedAt: null,
      lastNotifiedMinutes: null,
      active: true
    };

    this.subscriptions.set(id, sub);
    this.save();
    return sub;
  }

  unsubscribe(id) {
    const sub = this.subscriptions.get(id);
    if (sub) {
      this.subscriptions.delete(id);
      this.save();
      return true;
    }
    return false;
  }

  list(chatId) {
    const list = [];
    for (const sub of this.subscriptions.values()) {
      if (!chatId || sub.chatId === String(chatId)) {
        list.push(sub);
      }
    }
    return list;
  }

  getDeepLink(serviceId, stopId, leadMinutes = 8) {
    return buildDeepLinkUrl(this.botUsername, serviceId, stopId, leadMinutes);
  }

  /**
   * Envia mensagem para o Telegram (real se token configurado, mock/log caso contrário)
   */
  async sendTelegram(chatId, text) {
    if (this.botToken) {
      try {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        await axios.post(url, {
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        }, { timeout: 5000 });
        return true;
      } catch (err) {
        console.warn(`[RadarAlerts] Erro ao enviar mensagem para ${chatId}:`, err.message);
        return false;
      }
    } else {
      // Modo de teste / desenvolvimento sem token oficial do Telegram
      return true;
    }
  }

  /**
   * Ciclo de checagem dos radares ativos
   */
  async checkAlerts() {
    const activeSubs = Array.from(this.subscriptions.values()).filter(s => s.active);
    if (activeSubs.length === 0) return 0;

    let notificationsSent = 0;

    for (const sub of activeSubs) {
      try {
        const provider = providerRegistry.getProviderForService(sub.serviceId);
        const predictions = await provider.getStopPredictions(sub.serviceId, sub.stopId);

        if (!predictions || !Array.isArray(predictions.vehicles)) continue;

        for (const vehicle of predictions.vehicles) {
          if (shouldTriggerAlert(sub, vehicle)) {
            const message = formatTelegramMessage(sub, vehicle, this.appBaseUrl);
            const sent = await this.sendTelegram(sub.chatId, message);
            if (sent) {
              sub.lastNotifiedVehicleId = vehicle.vehicleId;
              sub.lastNotifiedAt = new Date().toISOString();
              sub.lastNotifiedMinutes = vehicle.minutesUntilArrival;
              notificationsSent++;
            }
            // Apenas 1 alerta por verificação para cada inscrição
            break;
          }
        }
      } catch (err) {
        console.warn(`[RadarAlerts] Erro ao checar sub ${sub.id}:`, err.message);
      }
    }

    if (notificationsSent > 0) {
      this.save();
    }
    return notificationsSent;
  }

  /**
   * Processa atualizações de Webhook vindas da API do Telegram
   */
  async handleTelegramWebhook(update) {
    if (!update || !update.message) return { ok: false, error: 'Sem mensagem' };

    const msg = update.message;
    const chatId = msg.chat?.id;
    const text = String(msg.text || '').trim();

    if (!chatId || !text) return { ok: false, error: 'Dados incompletos' };

    // 1. Comando /start com ou sem payload
    if (text.startsWith('/start')) {
      const parsed = parseStartPayload(text);
      if (parsed) {
        // Busca os detalhes da linha para enriquecer o aviso
        let lineCode = 'Linha';
        let stopName = `Parada ${parsed.stopId}`;
        let lineRoutesPath = '';

        try {
          const provider = providerRegistry.getProviderForService(parsed.serviceId);
          const predictions = await provider.getStopPredictions(parsed.serviceId, parsed.stopId);
          if (predictions) {
            lineCode = predictions.routeCode || lineCode;
            stopName = predictions.routeMnemonic ? `${predictions.routeMnemonic} (${parsed.stopId})` : stopName;
          }
        } catch {}

        const sub = this.subscribe({
          chatId,
          serviceId: parsed.serviceId,
          stopId: parsed.stopId,
          stopName,
          lineCode,
          lineRoutesPath,
          leadMinutes: parsed.leadMinutes
        });

        const reply = `✅ *Radar Ativado com Sucesso!*\n\n` +
          `🚌 Linha: *${sub.lineCode}*\n` +
          `📍 Parada: *${sub.stopName}*\n` +
          `⏱️ Avisaremos quando o ônibus estiver a cerca de *${sub.leadMinutes} minutos* do ponto.\n\n` +
          `Pode relaxar! Enviaremos uma notificação automática aqui quando for a hora de ir para o ponto.\n\n` +
          `Para gerenciar seus radares, envie \`/alertas\`.`;

        await this.sendTelegram(chatId, reply);
        return { ok: true, action: 'subscribed', subscriptionId: sub.id };
      }

      // /start genérico
      const welcome = `👋 *Olá! Bem-vindo ao Nexto+ Radar!*\n\n` +
        `Eu sou seu copiloto inteligente para o transporte público.\n\n` +
        `Com o Nexto+ Radar, você não precisa ficar atualizando o app ou esperando no ponto no frio ou na chuva. ` +
        `Basta ativar um radar no seu ponto habitual e eu te aviso no Telegram quando o ônibus estiver a poucos minutos de chegar!\n\n` +
        `📱 *Como usar:*\n` +
        `1. Abra o Nexto (https://nexto.app.br)\n` +
        `2. Selecione sua linha e seu ponto de ônibus\n` +
        `3. Toque no botão *"Avisar no Telegram"*\n\n` +
        `Comandos úteis:\n` +
        `• \`/alertas\` - Ver seus radares ativos\n` +
        `• \`/ajuda\` - Como funciona o Nexto+`;

      await this.sendTelegram(chatId, welcome);
      return { ok: true, action: 'welcome' };
    }

    // 2. Comando /alertas ou /listar
    if (text === '/alertas' || text === '/listar') {
      const subs = this.list(chatId);
      const reply = formatAlertsListMessage(subs);
      await this.sendTelegram(chatId, reply);
      return { ok: true, action: 'list' };
    }

    // 3. Comando /cancelar_<id> ou /cancelar <id>
    const cancelMatch = text.match(/^\/cancelar(?:_|\s+)(sub_[a-z0-9-]+)/i);
    if (cancelMatch) {
      const subId = cancelMatch[1];
      const removed = this.unsubscribe(subId);
      const reply = removed
        ? `🗑️ Radar \`${subId}\` cancelado com sucesso.`
        : `⚠️ Radar \`${subId}\` não encontrado ou já cancelado.`;
      await this.sendTelegram(chatId, reply);
      return { ok: true, action: 'unsubscribed', removed };
    }

    // 4. Ajuda
    if (text === '/ajuda' || text === '/help') {
      const help = `ℹ️ *Central de Ajuda Nexto+ Radar*\n\n` +
        `• \`/alertas\` - Lista seus pontos monitorados\n` +
        `• \`/cancelar_<id>\` - Cancela um radar específico\n` +
        `• Acesse https://nexto.app.br para adicionar novos pontos e acompanhar o mapa ao vivo.`;
      await this.sendTelegram(chatId, help);
      return { ok: true, action: 'help' };
    }

    return { ok: true, action: 'ignored' };
  }

  startPolling(intervalMs = 30000) {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      this.checkAlerts().catch(err => {
        console.warn('[RadarAlerts] Erro no polling de alertas:', err.message);
      });
    }, intervalMs);
    // Permite que o processo Node saia normalmente se apenas este timer estiver ativo
    if (this.pollTimer.unref) {
      this.pollTimer.unref();
    }
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

module.exports = new RadarAlertsService();
