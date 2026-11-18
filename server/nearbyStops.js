const fs = require('fs');
const path = require('path');
const cache = require('./cache');
const citta = require('./cittamobiService');
const providerRegistry = require('./providers/ProviderRegistry');
const {
  haversineDistance,
  walkMinutes,
  buildDirectionalTargets,
  extractRawStopsFromPlans,
  matchCatalogLines,
  assembleNearbyStops
} = require('./nearbyStopsCore');

const STOP_CACHE_FILE = path.join(__dirname, 'data', 'stop_coords_cache.json');
const NEARBY_TTL_MS = 5 * 60 * 1000;
const MAX_LINE_DETAIL_FETCHES = 24;

function readStopCacheFile() {
  if (!fs.existsSync(STOP_CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STOP_CACHE_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function persistEnrichedStops(cityId, stops) {
  if (!Array.isArray(stops) || stops.length === 0) return;
  try {
    const dir = path.dirname(STOP_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const raw = readStopCacheFile();
    for (const s of stops) {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
      const idPart = s.stopId || s.address || s.name;
      if (!idPart) continue;
      raw[`${cityId}:${idPart}`] = {
        stopId: s.stopId || null,
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        lines: Array.isArray(s.lines) ? s.lines : [],
        updatedAt: Date.now()
      };
    }
    fs.writeFileSync(STOP_CACHE_FILE, JSON.stringify(raw, null, 2), 'utf8');
  } catch {
    // Falha de I/O no cache em disco não deve interromper a resposta
  }
}

// Consulta síncrona sobre o cache local de paradas (compatível com formato legado e enriquecido)
function findNearbyStops(userLat, userLng, maxRadiusMeters = 2000, limit = 10, filterCityId = null) {
  if (!fs.existsSync(STOP_CACHE_FILE)) return [];

  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(STOP_CACHE_FILE, 'utf8'));
  } catch {
    return [];
  }

  const results = [];
  for (const [key, val] of Object.entries(raw)) {
    if (!val || typeof val.lat !== 'number' || typeof val.lng !== 'number') continue;

    const parts = key.split(':');
    const entryCityId = parseInt(parts[0], 10);
    if (filterCityId !== null && Number.isFinite(filterCityId) && entryCityId !== filterCityId) continue;

    const rawAddress = parts.slice(1).join(':');
    const cleanName = rawAddress.split(',')[0].trim().toUpperCase();
    const distanceMeters = haversineDistance(userLat, userLng, val.lat, val.lng);

    if (distanceMeters <= maxRadiusMeters) {
      results.push({
        stopId: val.stopId || null,
        cityId: entryCityId,
        address: val.address || rawAddress,
        name: val.name || cleanName || 'PARADA DE EMBARQUE',
        lat: val.lat,
        lng: val.lng,
        distanceMeters,
        walkTimeMinutes: walkMinutes(distanceMeters),
        lines: Array.isArray(val.lines) ? val.lines : []
      });
    }
  }

  results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return results.slice(0, limit);
}

async function findGtfsNearbyStops({ lat, lng, cityId, radius, limit }) {
  const provider = providerRegistry.getProviderForCity(cityId);
  const lines = await provider.getLines(cityId);
  const stopMap = new Map();

  await Promise.all((lines || []).map(async (line) => {
    try {
      const tracking = await provider.getLineTracking(line.lineRoutesPath, undefined, cityId);
      for (const s of (tracking?.stops || [])) {
        if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
        const distanceMeters = haversineDistance(lat, lng, s.lat, s.lng);
        if (distanceMeters > radius) continue;

        const key = s.stopId || `${s.lat.toFixed(5)}:${s.lng.toFixed(5)}`;
        let entry = stopMap.get(key);
        if (!entry) {
          entry = {
            stopId: s.stopId || null,
            cityId: Number(cityId),
            name: s.name || 'Parada de embarque',
            address: s.address || s.name || '',
            lat: s.lat,
            lng: s.lng,
            distanceMeters,
            walkTimeMinutes: walkMinutes(distanceMeters),
            lines: []
          };
          stopMap.set(key, entry);
        }
        entry.lines.push({
          id: line.id || null,
          routeCode: line.routeCode || '',
          routeMnemonic: line.routeMnemonic || '',
          serviceMnemonic: line.serviceMnemonic || '',
          bgColor: line.bgColor || '',
          fgColor: line.fgColor || '',
          lineRoutesPath: line.lineRoutesPath || '',
          companyName: line.companyName || '',
          serviceId: tracking?.serviceId || null,
          stopId: s.stopId || null
        });
      }
    } catch {
      // Ignora falha individual de linha GTFS
    }
  }));

  const results = Array.from(stopMap.values());
  results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return results.slice(0, limit);
}

// Descoberta ao vivo de paradas próximas com as linhas e stopIds que atendem cada ponto
async function findNearbyStopsWithLines({ lat, lng, cityId = 35, radius = 2500, limit = 8 }) {
  const numericCityId = Number(cityId) || 35;
  const cacheKey = `nearby:v2:${numericCityId}:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    let stops = [];
    if (numericCityId >= 9000) {
      stops = await findGtfsNearbyStops({ lat, lng, cityId: numericCityId, radius, limit });
    } else {
      const targets = buildDirectionalTargets(lat, lng, radius);
      const maxWalkDistance = Math.min(Math.max(radius, 1000), 2500);

      const [catalogLines, ...rawPlans] = await Promise.all([
        citta.getLinesByCityId(numericCityId),
        ...targets.map(t =>
          citta.planTripRaw({
            fromLat: lat,
            fromLng: lng,
            toLat: t.toLat,
            toLng: t.toLng,
            maxWalkDistance
          }).catch(() => null)
        )
      ]);

      const rawStops = extractRawStopsFromPlans(rawPlans, { lat, lng, radiusMeters: radius });
      rawStops.sort((a, b) => a.distanceMeters - b.distanceMeters);

      // Seleciona as linhas candidatas das paradas mais próximas para enriquecer stopId + serviceId
      const candidatePaths = new Set();
      for (const rs of rawStops) {
        for (const sig of rs.legSigs) {
          for (const cand of matchCatalogLines(sig, catalogLines, 2)) {
            if (cand.lineRoutesPath) candidatePaths.add(cand.lineRoutesPath);
            if (candidatePaths.size >= MAX_LINE_DETAIL_FETCHES) break;
          }
          if (candidatePaths.size >= MAX_LINE_DETAIL_FETCHES) break;
        }
        if (candidatePaths.size >= MAX_LINE_DETAIL_FETCHES) break;
      }

      const detailPairs = await Promise.all(
        Array.from(candidatePaths).map(async (linePath) => {
          try {
            return [linePath, await citta.getLineDetails(linePath)];
          } catch {
            return [linePath, null];
          }
        })
      );
      const detailsByPath = new Map(detailPairs.filter(([, d]) => Boolean(d)));

      stops = assembleNearbyStops({
        rawStops,
        catalogLines,
        detailsByPath,
        cityId: numericCityId,
        cleanFn: citta.cleanStopAddress,
        limit
      });
    }

    if (stops.length > 0) {
      persistEnrichedStops(numericCityId, stops);
      cache.set(cacheKey, stops, NEARBY_TTL_MS);
      return stops;
    }
  } catch (err) {
    console.warn('Falha ao enriquecer paradas próximas ao vivo, recorrendo ao cache:', err.message);
  }

  return findNearbyStops(lat, lng, radius, limit, numericCityId);
}

module.exports = {
  haversineDistance,
  findNearbyStops,
  findNearbyStopsWithLines
};
