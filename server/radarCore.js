/**
 * radarCore.js
 * Funções puras para o serviço de alertas proativos Nexto+ Radar (Telegram / Notificações).
 * Desacopladas de I/O e timers para testes determinísticos de alta velocidade.
 */

/**
 * Extrai parâmetros de serviço, ponto e antecedência do payload /start do Telegram
 * Formato esperado: "alert_<serviceId>_<stopId>_<leadMinutes>"
 * @param {string} payload - Texto recebido após /start
 * @returns {{ serviceId: string, stopId: string, leadMinutes: number }|null}
 */
function parseStartPayload(payload) {
  if (!payload || typeof payload !== 'string') return null;

  const clean = payload.trim().replace(/^\/start\s*/i, '');
  if (!clean.startsWith('alert_')) return null;

  const parts = clean.slice('alert_'.length).split('_');
  if (parts.length < 2) return null;

  const serviceId = parts[0];
  const stopId = parts[1];
  const parsedLead = parts[2] !== undefined ? parseInt(parts[2], 10) : NaN;
  const leadMinutes = Number.isNaN(parsedLead) ? 8 : Math.max(1, Math.min(30, parsedLead));

  if (!serviceId || !stopId) return null;

  return {
    serviceId,
    stopId,
    leadMinutes
  };
}

/**
 * Gera o link direto de ativação rápida no Telegram Bot
 * @param {string} botUsername - Nome de usuário do bot (ex: NextoRadarBot)
 * @param {string} serviceId - ID do serviço
 * @param {string} stopId - ID da parada
 * @param {number} [leadMinutes=8] - Minutos de antecedência desejados
 * @returns {string} Link https://t.me/...
 */
function buildDeepLinkUrl(botUsername, serviceId, stopId, leadMinutes = 8) {
  const username = (botUsername || 'NextoRadarBot').replace(/^@/, '');
  const payload = `alert_${encodeURIComponent(serviceId)}_${encodeURIComponent(stopId)}_${leadMinutes}`;
  return `https://t.me/${username}?start=${payload}`;
}

/**
 * Avalia se um veículo atende aos critérios para disparar alerta para o passageiro
 * @param {object} subscription - Inscrição do usuário
 * @param {object} vehicle - Veículo com previsão de chegada
 * @param {number} [nowMs=Date.now()] - Timestamp atual em milissegundos
 * @returns {boolean} True se deve disparar o alerta imediatamente
 */
function shouldTriggerAlert(subscription, vehicle, nowMs = Date.now()) {
  if (!subscription || !subscription.active) return false;
  if (!vehicle || typeof vehicle.minutesUntilArrival !== 'number') return false;

  const mins = vehicle.minutesUntilArrival;
  const lead = subscription.leadMinutes || 8;

  // Não alerta ônibus que já passaram (< 0) ou que ainda estão longe (> lead)
  if (mins > lead || mins < 0) return false;

  const lastId = subscription.lastNotifiedVehicleId;
  const lastTime = subscription.lastNotifiedAt ? new Date(subscription.lastNotifiedAt).getTime() : 0;
  const elapsedMinutes = (nowMs - lastTime) / (60 * 1000);

  // Se já alertamos sobre este exato veículo recentemente
  if (lastId && lastId === vehicle.vehicleId) {
    // Alerta de novo apenas se já se passaram mais de 20 minutos (nova viagem)
    // OU se o primeiro alerta foi antecipado (> 5 min) e agora o ônibus está iminente (<= 2 min)
    const isUrgentFollowUp = mins <= 2 && subscription.lastNotifiedMinutes > 4 && elapsedMinutes > 2;
    if (isUrgentFollowUp) {
      return true;
    }
    return elapsedMinutes > 20;
  }

  return true;
}

/**
 * Formata o texto em Markdown para envio via Telegram Bot
 * @param {object} subscription - Inscrição
 * @param {object} vehicle - Veículo
 * @param {string} [appBaseUrl="https://nexto.app.br"] - URL pública do Nexto
 * @returns {string} Mensagem formatada para o passageiro
 */
function formatTelegramMessage(subscription, vehicle, appBaseUrl = 'https://nexto.app.br') {
  const line = subscription.lineCode || 'Linha';
  const dest = subscription.lineDestination ? ` → ${subscription.lineDestination}` : '';
  const stop = subscription.stopName || 'seu ponto de embarque';
  const mins = vehicle.minutesUntilArrival;

  const etaLabel = mins <= 1 ? 'chegando agora!' : `a cerca de *${mins} minutos*`;
  const urgentBadge = mins <= 2 ? '⚡ *Atenção imediata!*' : '⏰ *Alerta de Proximidade:*';

  let msg = `${urgentBadge}\n\n`;
  msg += `🚌 Linha: *${line}*${dest}\n`;
  msg += `📍 Parada: *${stop}*\n`;
  msg += `⏱️ Previsão: ${etaLabel}\n`;

  if (vehicle.vehicleId) {
    msg += `🔢 Prefixo do veículo: \`${vehicle.licensePlate || vehicle.vehicleId}\`\n`;
  }

  msg += `\n🏃 Hora de se preparar para o embarque!\n\n`;

  const webLink = subscription.lineRoutesPath
    ? `${appBaseUrl}/?linha=${encodeURIComponent(subscription.lineRoutesPath)}`
    : appBaseUrl;

  msg += `👉 [Acompanhar ao vivo no mapa do Nexto](${webLink})`;
  return msg;
}

/**
 * Formata a lista de inscrições ativas para o comando /alertas do Telegram
 * @param {Array} subscriptions - Lista de inscrições
 * @returns {string} Mensagem formatada
 */
function formatAlertsListMessage(subscriptions) {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return '📭 Você não possui nenhum radar ativo no momento.\n\nPara ativar um radar, salve um ponto no Nexto e clique em "Criar Alerta" ou use o botão do Telegram!';
  }

  let text = '🔔 *Seus Radares Ativos no Nexto+:*\n\n';
  subscriptions.forEach((sub, i) => {
    const line = sub.lineCode || 'Linha';
    const stop = sub.stopName || sub.stopId;
    const lead = sub.leadMinutes || 8;
    text += `${i + 1}. *${line}* em *${stop}*\n`;
    text += `   ⏱️ Avisar com *${lead} min* de antecedência\n`;
    text += `   ❌ Para cancelar: \`/cancelar_${sub.id}\`\n\n`;
  });

  return text.trim();
}

module.exports = {
  parseStartPayload,
  buildDeepLinkUrl,
  shouldTriggerAlert,
  formatTelegramMessage,
  formatAlertsListMessage
};
