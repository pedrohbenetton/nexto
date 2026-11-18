// Utilitários puros da tela "Perto de mim" (paradas próximas e abertura direta na linha+parada).

export function buildNearbyStopsPath({ lat, lng, cityId, radius = 2500, limit = 10 }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng)
  });
  if (cityId !== undefined && cityId !== null && cityId !== '') {
    params.set('cityId', String(cityId));
  }
  if (radius) params.set('radius', String(radius));
  if (limit) params.set('limit', String(limit));
  return `/api/stops/nearby?${params.toString()}`;
}

export function formatDistance(meters) {
  const m = Math.max(0, Math.round(Number(meters) || 0));
  if (m < 1000) return `${m} m`;
  return `${(Math.round(m / 100) / 10).toFixed(1).replace('.', ',')} km`;
}

export function stopSubtitle(stop) {
  const name = String(stop?.name || '').trim();
  const address = String(stop?.address || '').trim();
  if (!address || address.toLowerCase() === name.toLowerCase()) return '';

  if (name && address.toLowerCase().startsWith(name.toLowerCase())) {
    return address.slice(name.length).replace(/^[\s,\-–]+/, '').trim();
  }
  return address;
}

export function lineDestinationLabel(line) {
  const code = String(line?.routeCode || '').trim();
  const raw = String(line?.serviceMnemonic || line?.routeMnemonic || '').trim();
  if (!raw) return 'Ver horários e ônibus';

  if (code) {
    const stripped = raw.replace(new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–:]\\s*`, 'i'), '').trim();
    if (stripped) return stripped;
  }
  return raw;
}

export function resolveStopLineSelection(stop, stopLine, catalogLines = []) {
  const found = Array.isArray(catalogLines)
    ? catalogLines.find(l => l.lineRoutesPath && l.lineRoutesPath === stopLine?.lineRoutesPath)
    : null;
  return {
    line: found || stopLine,
    stopId: stopLine?.stopId || stop?.stopId || null
  };
}
