/**
 * radarCore.js (Client)
 * Utilitários para configuração do serviço Nexto+ Radar no Telegram
 */

/**
 * Constrói o deep link oficial para o bot do Telegram
 * @param {string} botUsername
 * @param {string} serviceId
 * @param {string} stopId
 * @param {number} leadMinutes
 * @returns {string}
 */
export function buildRadarBotUrl(botUsername, serviceId, stopId, leadMinutes = 8) {
  const username = (botUsername || 'NextoRadarBot').replace(/^@/, '');
  const srv = encodeURIComponent(serviceId || '');
  const st = encodeURIComponent(stopId || '');
  const mins = Math.max(1, Math.min(30, Number(leadMinutes) || 8));
  return `https://t.me/${username}?start=alert_${srv}_${st}_${mins}`;
}

/**
 * Formata descrição legível da antecedência
 * @param {number} minutes
 * @returns {string}
 */
export function formatLeadTimeLabel(minutes) {
  const m = Number(minutes) || 8;
  if (m === 1) return '1 minuto antes (iminente)';
  if (m < 5) return `${m} minutos antes (rápido)`;
  if (m <= 10) return `${m} minutos antes (recomendado)`;
  return `${m} minutos antes (com calma)`;
}
