// Compartilhar viagem: link de acompanhamento ao vivo e mensagem pronta (lógica pura, testável)
const PARAMS = {
  lineRoutesPath: 'linha',
  serviceId: 'servico',
  stopId: 'parada',
  vehicleId: 'onibus',
  routeCode: 'codigo'
};

export function buildShareUrl(base, trip) {
  const origin = String(base || '').trim().replace(/\/+$/, '');
  if (!origin) return null;
  const query = new URLSearchParams();
  for (const [field, param] of Object.entries(PARAMS)) {
    if (trip[field]) query.set(param, trip[field]);
  }
  return `${origin}/?${query.toString()}`;
}

export function parseShareParams(search) {
  const query = new URLSearchParams(search || '');
  if (!query.get(PARAMS.lineRoutesPath)) return null;
  const trip = {};
  for (const [field, param] of Object.entries(PARAMS)) {
    const value = query.get(param);
    if (value) trip[field] = value;
  }
  return trip;
}

export function arrivalClock(seconds, now = new Date()) {
  const at = new Date(now.getTime() + seconds * 1000);
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
}

export function buildShareMessage({ line, stopName, seconds, now = new Date(), url }) {
  const title = line.routeMnemonic ? `🚍 Ônibus ${line.routeCode} · ${line.routeMnemonic}` : `🚍 Ônibus ${line.routeCode}`;
  const eta = seconds <= 60
    ? `Está chegando em ${stopName} agora.`
    : `Chega em ${stopName} por volta de ${arrivalClock(seconds, now)} (em ~${Math.round(seconds / 60)} min).`;
  return [title, eta, url && `Acompanhe ao vivo: ${url}`].filter(Boolean).join('\n');
}
