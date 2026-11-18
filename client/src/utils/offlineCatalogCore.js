// Lógica pura para cache offline de itinerários/horários, índice de busca por paradas e partidas programadas.

export function normalizeFold(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function putCachedLineDetails(store, lineRoutesPath, details, { now = Date.now(), maxEntries = 24 } = {}) {
  if (!lineRoutesPath || !details) return store || {};
  const next = { ...(store || {}), [lineRoutesPath]: { at: now, details } };
  const keys = Object.keys(next);
  if (keys.length <= maxEntries) return next;

  keys.sort((a, b) => (next[b]?.at || 0) - (next[a]?.at || 0));
  const trimmed = {};
  for (const k of keys.slice(0, maxEntries)) {
    trimmed[k] = next[k];
  }
  return trimmed;
}

export function buildStopSearchIndex(detailsStore = {}, savedStops = []) {
  const buckets = {};

  for (const [pathKey, entry] of Object.entries(detailsStore || {})) {
    const stops = entry?.details?.stops;
    if (!pathKey || !Array.isArray(stops)) continue;
    buckets[pathKey] = stops.map(s => normalizeFold(s.name)).filter(Boolean);
  }

  for (const saved of (savedStops || [])) {
    const pathKey = saved?.line?.lineRoutesPath;
    if (!pathKey || !saved?.stopName) continue;
    buckets[pathKey] = buckets[pathKey] || [];
    buckets[pathKey].push(normalizeFold(saved.stopName));
  }

  const index = {};
  for (const [pathKey, parts] of Object.entries(buckets)) {
    index[pathKey] = parts.join(' ');
  }
  return index;
}

function toMinutesOfDay(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function partitionScheduledDepartures(departures = [], nowDate = new Date()) {
  const all = Array.isArray(departures) ? departures : [];
  const currentMin = nowDate.getHours() * 60 + nowDate.getMinutes();

  const upcoming = all.filter(t => {
    const m = toMinutesOfDay(t);
    return m !== null && m >= currentMin;
  });

  return {
    nextDeparture: upcoming[0] || null,
    upcoming,
    all
  };
}
