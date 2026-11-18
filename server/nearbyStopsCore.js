// Lógica pura de descoberta e associação de paradas próximas com as linhas que as atendem.

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function walkMinutes(distanceMeters) {
  return Math.max(1, Math.round(distanceMeters / 80));
}

function normalizeRouteCode(code) {
  return String(code || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function normalizeStopText(str) {
  return String(str || '')
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

function extractHouseNumbers(str) {
  return String(str || '')
    .replace(/\d{5}-?\d{3}/g, '')
    .match(/\b\d{1,5}\b/g) || [];
}

function splitStopDisplayName(cleanAddress) {
  const addr = String(cleanAddress || '').trim();
  if (!addr) return { name: 'Parada de embarque', address: '' };
  const [first, ...rest] = addr.split(/\s+-\s+/);
  return {
    name: first.trim() || addr,
    address: addr,
    subtitle: rest.join(' - ').trim()
  };
}

function buildDirectionalTargets(lat, lng, radiusMeters = 2500) {
  const offsetDeg = Math.max(0.035, (radiusMeters * 1.5) / 111195);
  return [
    { toLat: lat + offsetDeg, toLng: lng },
    { toLat: lat - offsetDeg, toLng: lng },
    { toLat: lat, toLng: lng + offsetDeg },
    { toLat: lat, toLng: lng - offsetDeg }
  ];
}

function extractRawStopsFromPlans(rawPlans, { lat, lng, radiusMeters = 2500 }) {
  const buckets = new Map();

  const recordStop = (name, stopLat, stopLng, leg) => {
    if (!Number.isFinite(stopLat) || !Number.isFinite(stopLng) || stopLat === 0 || stopLng === 0) return;
    const distanceMeters = haversineDistance(lat, lng, stopLat, stopLng);
    if (distanceMeters > radiusMeters) return;

    const coordKey = `${stopLat.toFixed(5)}:${stopLng.toFixed(5)}`;
    let bucket = buckets.get(coordKey);
    if (!bucket) {
      bucket = {
        name: name || 'Parada de embarque',
        lat: stopLat,
        lng: stopLng,
        distanceMeters,
        legMap: new Map()
      };
      buckets.set(coordKey, bucket);
    } else if (!bucket.name && name) {
      bucket.name = name;
    }

    if (leg?.routeshortname) {
      const sigKey = `${leg.routeshortname}|${leg.headsign || ''}`;
      if (!bucket.legMap.has(sigKey)) {
        bucket.legMap.set(sigKey, {
          routeCode: leg.routeshortname,
          headsign: leg.headsign || '',
          lineName: leg.routelongname || leg.route || '',
          agencyName: leg.agencyname || '',
          color: leg.color || '',
          textColor: leg.textcolor || ''
        });
      }
    }
  };

  for (const plan of (rawPlans || [])) {
    if (!plan || plan.haserror) continue;
    for (const it of (plan.itineraries || [])) {
      for (const leg of (it.legs || [])) {
        if (!leg || !leg.mode || leg.mode === 'WALK') continue;
        recordStop(leg.stopfromname, leg.stopfromlat, leg.stopfromlng, leg);

        const names = leg.intermediatestopsnames || [];
        const lats = leg.intermediatestopslat || [];
        const lngs = leg.intermediatestopslng || [];
        const count = Math.min(names.length, lats.length, lngs.length);
        for (let i = 0; i < count; i++) {
          recordStop(names[i], lats[i], lngs[i], leg);
        }

        recordStop(leg.stoptoname, leg.stoptolat, leg.stoptolng, leg);
      }
    }
  }

  return Array.from(buckets.values()).map(b => ({
    name: b.name,
    lat: b.lat,
    lng: b.lng,
    distanceMeters: b.distanceMeters,
    legSigs: Array.from(b.legMap.values())
  }));
}

function matchCatalogLines(legSig, catalogLines, maxCandidates = 3) {
  const code = normalizeRouteCode(legSig?.routeCode);
  if (!code || !Array.isArray(catalogLines)) return [];

  const candidates = catalogLines.filter(l => normalizeRouteCode(l.routeCode) === code);
  if (candidates.length <= 1) return candidates;

  const hs = normalizeStopText(legSig.headsign);
  const ln = normalizeStopText(legSig.lineName);
  const hsTokens = new Set(`${hs} ${ln}`.split(' ').filter(t => t.length >= 3));
  const hsHasDir = hs.includes('centro') || hs.includes('bairro');

  const scored = candidates.map((c, idx) => {
    const sm = normalizeStopText(c.serviceMnemonic);
    const rm = normalizeStopText(c.routeMnemonic);
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

    for (const token of `${sm} ${rm}`.split(' ')) {
      if (token.length >= 3 && hsTokens.has(token)) score += 12;
    }

    if ((sm.includes('garagem') || sm.includes('at2')) && !hs.includes('garagem') && !hs.includes('at2')) {
      score -= 15;
    }

    return { c, score, idx };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
  return scored.slice(0, maxCandidates).map(s => s.c);
}

const GENERIC_STREET_WORDS = new Set([
  'avenida', 'rua', 'doutor', 'general', 'presidente', 'professor',
  'rodovia', 'praca', 'estrada', 'alameda', 'sorocaba', 'paulo', 'brasil'
]);

function matchStopInLineDetails(rawStopName, detailStops, cleanFn) {
  if (!Array.isArray(detailStops) || detailStops.length === 0) return null;
  const cleaned = typeof cleanFn === 'function'
    ? cleanFn(rawStopName, '', -1, 0)
    : String(rawStopName || '').replace(/,\s*\d{5}-?\d{3}/g, '').replace(/,\s*Brasil$/i, '').trim();

  const targetNorm = normalizeStopText(cleaned);
  const headPart = cleaned.split(/\s+-\s+/)[0] || cleaned;
  const targetStreet = normalizeStopText(headPart.split(',')[0]);
  const targetNums = extractHouseNumbers(headPart);

  let best = null;
  let bestScore = 0;

  for (const s of detailStops) {
    const sName = String(s.name || '');
    const sNorm = normalizeStopText(sName);
    if (targetNorm && sNorm === targetNorm) return s;

    const sHead = sName.split(/\s+-\s+/)[0] || sName;
    const sStreet = normalizeStopText(sHead.split(',')[0]);
    const sNums = extractHouseNumbers(sHead);

    let score = 0;
    if (targetStreet && sStreet && (sStreet === targetStreet || sStreet.includes(targetStreet) || targetStreet.includes(sStreet))) {
      score += 45;
    } else {
      const words = targetStreet.split(' ').filter(w => w.length >= 4 && !GENERIC_STREET_WORDS.has(w));
      const shared = words.filter(w => sStreet.includes(w));
      score += shared.length * 18;
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

  return bestScore >= 45 ? best : null;
}

function summarizeLineForStop(line, serviceId, stopId) {
  return {
    id: line.id || null,
    routeCode: line.routeCode || '',
    routeMnemonic: line.routeMnemonic || '',
    serviceMnemonic: line.serviceMnemonic || '',
    bgColor: line.bgColor || '',
    fgColor: line.fgColor || '',
    lineRoutesPath: line.lineRoutesPath || '',
    companyName: line.companyName || '',
    serviceId: serviceId || null,
    stopId: stopId || null
  };
}

function lineDedupeKey(line) {
  return `${normalizeRouteCode(line.routeCode)}|${normalizeStopText(line.serviceMnemonic || line.routeMnemonic)}`;
}

function assembleNearbyStops({ rawStops, catalogLines = [], detailsByPath = new Map(), cityId = 35, cleanFn, limit = 8 }) {
  const byPath = new Map(catalogLines.map(l => [l.lineRoutesPath, l]));
  const stopEntries = [];

  for (const raw of (rawStops || [])) {
    const candidateLines = [];
    const seenPaths = new Set();
    for (const sig of (raw.legSigs || [])) {
      const ranked = matchCatalogLines(sig, catalogLines, 2);
      ranked.forEach((cand, rank) => {
        if (!seenPaths.has(cand.lineRoutesPath)) {
          seenPaths.add(cand.lineRoutesPath);
          candidateLines.push({ line: cand, rank });
        }
      });
    }

    let primaryStopId = null;
    let cleanedAddress = typeof cleanFn === 'function'
      ? cleanFn(raw.name, '', -1, 0)
      : String(raw.name || '').trim();

    const verifiedLines = new Map();

    for (const { line, rank } of candidateLines) {
      const det = detailsByPath.get(line.lineRoutesPath);
      if (det && Array.isArray(det.stops)) {
        const matched = (primaryStopId && det.stops.find(s => s.stopId === primaryStopId))
          || matchStopInLineDetails(raw.name, det.stops, cleanFn);
        if (!matched) continue;
        if (!primaryStopId) {
          primaryStopId = matched.stopId;
          cleanedAddress = matched.name || cleanedAddress;
        }
        const dKey = lineDedupeKey(line);
        if (!verifiedLines.has(dKey)) {
          verifiedLines.set(dKey, summarizeLineForStop(line, det.serviceId, matched.stopId));
        }
      } else if (rank === 0) {
        const dKey = lineDedupeKey(line);
        if (!verifiedLines.has(dKey)) {
          verifiedLines.set(dKey, summarizeLineForStop(line, null, primaryStopId));
        }
      }
    }

    // Cruza demais linhas já carregadas em detailsByPath que também atendem o mesmo stopId
    if (primaryStopId) {
      for (const [pathKey, det] of detailsByPath.entries()) {
        if (!det || !Array.isArray(det.stops)) continue;
        if (!det.stops.some(s => s.stopId === primaryStopId)) continue;
        const catLine = byPath.get(pathKey);
        if (!catLine) continue;
        const dKey = lineDedupeKey(catLine);
        if (!verifiedLines.has(dKey)) {
          verifiedLines.set(dKey, summarizeLineForStop(catLine, det.serviceId, primaryStopId));
        }
      }
    }

    const display = splitStopDisplayName(cleanedAddress);
    stopEntries.push({
      stopId: primaryStopId,
      cityId: Number(cityId),
      name: display.name,
      address: display.address,
      lat: raw.lat,
      lng: raw.lng,
      distanceMeters: raw.distanceMeters,
      walkTimeMinutes: walkMinutes(raw.distanceMeters),
      lines: Array.from(verifiedLines.values())
    });
  }

  // Mescla entradas que resolveram exatamente para o mesmo stopId mantendo a mais próxima
  const merged = new Map();
  let anonIdx = 0;
  for (const entry of stopEntries) {
    const mKey = entry.stopId || `coord:${anonIdx++}`;
    const prev = merged.get(mKey);
    if (!prev) {
      merged.set(mKey, entry);
      continue;
    }
    const existingKeys = new Set(prev.lines.map(lineDedupeKey));
    for (const l of entry.lines) {
      const k = lineDedupeKey(l);
      if (!existingKeys.has(k)) {
        existingKeys.add(k);
        prev.lines.push(l);
      }
    }
    if (entry.distanceMeters < prev.distanceMeters) {
      prev.lat = entry.lat;
      prev.lng = entry.lng;
      prev.distanceMeters = entry.distanceMeters;
      prev.walkTimeMinutes = entry.walkTimeMinutes;
    }
  }

  const finalStops = Array.from(merged.values());
  finalStops.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return finalStops.slice(0, limit);
}

module.exports = {
  haversineDistance,
  walkMinutes,
  normalizeRouteCode,
  normalizeStopText,
  splitStopDisplayName,
  buildDirectionalTargets,
  extractRawStopsFromPlans,
  matchCatalogLines,
  matchStopInLineDetails,
  assembleNearbyStops
};
