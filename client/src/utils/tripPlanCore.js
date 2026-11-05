// Lógica pura do planejador de rotas (A -> B) no cliente

// "Rua X, Bairro, Cidade, Estado, CEP, BRA" -> "Rua X, Bairro"
export function shortPlaceName(name) {
  if (!name) return '';
  return String(name).split(',').map(p => p.trim()).filter(Boolean).slice(0, 2).join(', ');
}

// O autocomplete devolve lat/lng 0: as coordenadas vêm de /api/places/resolve
export function needsResolve(place) {
  return !place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng) || (place.lat === 0 && place.lng === 0);
}

export function buildTripPath({ from, to, dateTime, arriveBy }) {
  let path = `/api/trip?fromLat=${from.lat}&fromLng=${from.lng}&toLat=${to.lat}&toLng=${to.lng}`;
  if (dateTime) path += `&dateTime=${dateTime}`;
  if (arriveBy) path += '&arriveBy=1';
  return path;
}

export function formatDuration(min) {
  const total = Math.max(0, Math.round(min || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatClock(iso) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function summarizeItinerary(itinerary) {
  const legs = itinerary.legs || [];
  const transfers = itinerary.transfers || 0;
  return {
    lines: legs.filter(l => !l.isWalk).map(l => l.lineCode),
    walkMin: legs.filter(l => l.isWalk).reduce((sum, l) => sum + (l.durationMin || 0), 0),
    transfersLabel: transfers === 0 ? 'Direto' : transfers === 1 ? '1 baldeação' : `${transfers} baldeações`
  };
}

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(meters)} m`;
}

export function describeLeg(leg) {
  if (leg.isWalk) return `Caminhe ${leg.durationMin} min (${formatDistance(leg.distanceM || 0)})`;
  const heading = leg.headsign ? ` sentido ${leg.headsign}` : '';
  return `Linha ${leg.lineCode || '—'}${heading} · ${leg.durationMin} min`;
}

export function itineraryPoints(itinerary) {
  return (itinerary.legs || []).flatMap(l => l.path || []);
}
