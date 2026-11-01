// Alerta de descida: decide quando avisar a partir da distância até o ponto de destino
export const ALIGHT_THRESHOLDS = { approaching: 500, now: 150 };
export const MAX_ACCURACY_M = 200;

const STAGE_ORDER = { far: 0, approaching: 1, now: 2 };

export function distanceMeters(a, b) {
  const R = 6371e3;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

// Estágios só avançam (far → approaching → now); cada avanço gera um único aviso
export function nextAlightState(prevStage, { distance, accuracy }) {
  if (accuracy > MAX_ACCURACY_M) return { stage: prevStage, notify: null };

  const measured = distance <= ALIGHT_THRESHOLDS.now
    ? 'now'
    : distance <= ALIGHT_THRESHOLDS.approaching ? 'approaching' : 'far';

  if (STAGE_ORDER[measured] <= STAGE_ORDER[prevStage]) return { stage: prevStage, notify: null };
  return { stage: measured, notify: measured };
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
