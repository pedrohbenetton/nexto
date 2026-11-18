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

// Converte a escolha de horário da UI em { dateTime(ms), arriveBy }.
// mode: 'now' | 'depart' | 'arrive'; clock: "HH:MM". Se o horário já passou hoje, vale amanhã.
export function resolveTripTime({ mode, clock, now = Date.now() }) {
  const none = { dateTime: undefined, arriveBy: false };
  if (mode !== 'depart' && mode !== 'arrive') return none;
  const m = /^(\d{1,2}):(\d{2})$/.exec(clock || '');
  if (!m) return none;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return none;
  const target = new Date(now);
  target.setHours(h, min, 0, 0);
  if (target.getTime() <= now) target.setDate(target.getDate() + 1);
  return { dateTime: target.getTime(), arriveBy: mode === 'arrive' };
}

function normCode(s) {
  return String(s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function normStopText(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bav\.?\s*/g, 'avenida ')
    .replace(/\br\.?\s*/g, 'rua ')
    .replace(/\bpres\.?\s*/g, 'presidente ')
    .replace(/\bgen\.?\s*|\bgal\.?\s*/g, 'general ')
    .replace(/\bdr\.?\s*/g, 'doutor ')
    .replace(/\bprof\.?\s*/g, 'professor ')
    .replace(/\brod\.?\s*/g, 'rodovia ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function houseNums(s) {
  return String(s || '').replace(/\d{5}-?\d{3}/g, '').match(/\b\d{1,5}\b/g) || [];
}

// Associa um trecho de ônibus do planejador à linha equivalente do catálogo da cidade
export function matchLegToCatalogLine(leg, catalogLines = []) {
  if (!leg || leg.isWalk) return null;
  const code = normCode(leg.lineCode);
  if (!code || !Array.isArray(catalogLines)) return null;

  const candidates = catalogLines.filter(l => normCode(l.routeCode) === code);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const hs = normStopText(leg.headsign);
  const ln = normStopText(leg.lineName);
  const hsTokens = new Set(`${hs} ${ln}`.split(' ').filter(t => t.length >= 3));
  const hsHasDir = hs.includes('centro') || hs.includes('bairro');

  let best = candidates[0];
  let bestScore = -Infinity;

  for (const c of candidates) {
    const sm = normStopText(c.serviceMnemonic);
    const rm = normStopText(c.routeMnemonic);
    const smHasDir = sm.includes('centro') || sm.includes('bairro');
    let score = 0;

    if (hs && sm === hs) score += 120;
    else if (hs && sm && (sm.includes(hs) || hs.includes(sm))) score += 70;

    if (hsHasDir && smHasDir) {
      for (const dir of ['centro', 'bairro']) {
        if (hs.includes(dir) && sm.includes(dir)) score += 45;
        else if (hs.includes(dir) !== sm.includes(dir)) score -= 45;
      }
    }

    for (const t of `${sm} ${rm}`.split(' ')) {
      if (t.length >= 3 && hsTokens.has(t)) score += 12;
    }

    if ((sm.includes('garagem') || sm.includes('at2')) && !hs.includes('garagem') && !hs.includes('at2')) {
      score -= 15;
    }

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best;
}

// Seleciona a parada inicial no drawer por stopId exato ou pelo endereço do embarque
export function findInitialStop(stops = [], { stopId, stopName } = {}) {
  if (!Array.isArray(stops) || stops.length === 0) return null;

  if (stopId) {
    const byId = stops.find(s => s.stopId === stopId);
    if (byId) return byId;
  }

  if (stopName) {
    const cleanTarget = String(stopName)
      .replace(/SP-079,\s*1970/i, 'Av. Dr. Armando Pannunzio, 1970')
      .replace(/SP-079,\s*825-901/i, 'Av. Dr. Armando Pannunzio, 825-901')
      .replace(/SP-079,\s*319/i, 'Av. Dr. Armando Pannunzio, 319')
      .replace(/SP-079,\s*2171/i, 'Av. General Carneiro, 2171')
      .replace(/,\s*\d{5}-?\d{3}/g, '')
      .replace(/,\s*Brasil$/i, '')
      .trim();

    const targetNorm = normStopText(cleanTarget);
    const head = cleanTarget.split(/\s+-\s+/)[0] || cleanTarget;
    const targetStreet = normStopText(head.split(',')[0]);
    const targetNums = houseNums(head);

    let best = null;
    let bestScore = 0;

    for (const s of stops) {
      const sName = String(s.name || '');
      const sNorm = normStopText(sName);
      if (targetNorm && sNorm === targetNorm) return s;

      const sHead = sName.split(/\s+-\s+/)[0] || sName;
      const sStreet = normStopText(sHead.split(',')[0]);
      const sNums = houseNums(sHead);

      let score = 0;
      if (targetStreet && sStreet && (sStreet === targetStreet || sStreet.includes(targetStreet) || targetStreet.includes(sStreet))) {
        score += 45;
      }
      if (targetNums.length > 0 && sNums.length > 0) {
        if (targetNums.some(n => sNums.includes(n))) score += 60;
        else score -= 40;
      }

      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }

    if (bestScore >= 45) return best;
  }

  return stops[0];
}

function foldAccents(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Monta a URL de /api/autocomplete evitando duplicar o município e aplicando viés geográfico (lat/lng)
export function buildAutocompletePath(rawTerm, { cityName, lat, lng } = {}) {
  const term = String(rawTerm || '').trim();
  const cleanCity = String(cityName || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
  const foldedTerm = foldAccents(term);
  const foldedCity = foldAccents(cleanCity);

  const query = cleanCity && !foldedTerm.includes(foldedCity)
    ? `${term}, ${cleanCity}`
    : term;

  let url = `/api/autocomplete?term=${encodeURIComponent(query)}`;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    url += `&lat=${lat}&lng=${lng}`;
  }
  return url;
}

// Ordena e deduplica sugestões do autocomplete priorizando endereços situados no município ativo
export function rankPlaceSuggestions(places = [], cityName = '', limit = 6) {
  if (!Array.isArray(places) || places.length === 0) return [];
  const cleanCity = foldAccents(String(cityName || '').replace(/\s*\([^)]*\)\s*/g, ''));

  const annotated = places
    .filter(p => p && typeof p.nome === 'string' && p.nome.trim())
    .map((place, index) => {
      const segments = place.nome.split(',').map(seg => foldAccents(seg)).filter(Boolean);
      const inActiveCity = cleanCity
        ? segments.slice(1).some(seg => seg === cleanCity || seg.startsWith(`${cleanCity} -`))
        : true;
      return { place, index, inActiveCity };
    });

  const hasAnyInCity = cleanCity && annotated.some(item => item.inActiveCity);
  const filtered = hasAnyInCity
    ? annotated.filter(item => item.inActiveCity)
    : annotated;

  filtered.sort((a, b) => {
    if (a.inActiveCity !== b.inActiveCity) return a.inActiveCity ? -1 : 1;
    return a.index - b.index;
  });

  const seen = new Set();
  const unique = [];
  for (const { place } of filtered) {
    const key = foldAccents(shortPlaceName(place.nome));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(place);
    if (unique.length >= limit) break;
  }
  return unique;
}
