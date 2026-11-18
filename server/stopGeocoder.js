const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'data', 'stop_coords_cache.json');
const ROUTES_CACHE_FILE = path.join(__dirname, 'data', 'routes_geometry_cache.json');

// Carregar caches em disco
let coordsCache = {};
let routesCache = {};

function initCaches() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(CACHE_FILE)) {
      coordsCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
    if (fs.existsSync(ROUTES_CACHE_FILE)) {
      routesCache = JSON.parse(fs.readFileSync(ROUTES_CACHE_FILE, 'utf-8'));
    }
  } catch {
    coordsCache = {};
    routesCache = {};
  }
}
initCaches();

function saveRoutesCache() {
  if (process.env.NODE_TEST_CONTEXT) return;
  try {
    fs.writeFileSync(ROUTES_CACHE_FILE, JSON.stringify(routesCache, null, 2), 'utf-8');
  } catch {}
}

function saveCoordsCache() {
  if (process.env.NODE_TEST_CONTEXT) return;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(coordsCache, null, 2), 'utf-8');
  } catch {}
}

// Centros e eixos viários de referência por cidade (Cittamobi & GTFS)
const CITY_PROFILES = {
  35: {
    name: 'Sorocaba',
    state: 'SP',
    slugs: ['sorocaba'],
    center: [-23.505427, -47.452724],
    fallbackWaypoints: [
      [-23.505427, -47.452724],
      [-23.501500, -47.459000],
      [-23.493889, -47.460833]
    ]
  },
  28: {
    name: 'São Paulo',
    state: 'SP',
    slugs: ['saopaulo'],
    center: [-23.550520, -46.633308],
    fallbackWaypoints: [
      [-23.550520, -46.633308],
      [-23.561414, -46.655881],
      [-23.545800, -46.638900]
    ]
  },
  9001: {
    name: 'São Paulo',
    state: 'SP',
    slugs: ['gtfs-sp'],
    center: [-23.550520, -46.633308],
    fallbackWaypoints: [
      [-23.518800, -46.702200],
      [-23.529800, -46.671100],
      [-23.545800, -46.638900]
    ]
  },
  8: {
    name: 'Salvador',
    state: 'BA',
    slugs: ['salvador'],
    center: [-12.977749, -38.501630],
    fallbackWaypoints: [
      [-12.977749, -38.501630],
      [-12.981500, -38.465000],
      [-13.006575, -38.509064]
    ]
  },
  16: {
    name: 'Belo Horizonte',
    state: 'MG',
    slugs: ['belohorizonte'],
    center: [-19.919052, -43.938668],
    fallbackWaypoints: [
      [-19.919052, -43.938668],
      [-19.932000, -43.938000],
      [-19.912000, -43.926000]
    ]
  },
  20: {
    name: 'Recife',
    state: 'PE',
    slugs: ['recife'],
    center: [-8.063169, -34.871139],
    fallbackWaypoints: [
      [-8.063169, -34.871139],
      [-8.057800, -34.882900],
      [-8.047600, -34.897000]
    ]
  },
  10: {
    name: 'Brasília',
    state: 'DF',
    slugs: ['brasilia'],
    center: [-15.793889, -47.882778],
    fallbackWaypoints: [
      [-15.793889, -47.882778],
      [-15.799000, -47.864000],
      [-15.815000, -47.905000]
    ]
  },
  5: {
    name: 'Maceió',
    state: 'AL',
    slugs: ['maceio'],
    center: [-9.665992, -35.735000],
    fallbackWaypoints: [
      [-9.665992, -35.735000],
      [-9.649800, -35.708900],
      [-9.619000, -35.738000]
    ]
  },
  9002: {
    name: 'Rio de Janeiro',
    state: 'RJ',
    slugs: ['gtfs-rj', 'riodejaneiro'],
    center: [-22.903500, -43.209600],
    fallbackWaypoints: [
      [-22.903500, -43.209600],
      [-22.906800, -43.172900],
      [-22.951900, -43.185700]
    ]
  }
};

function extractCityHint(linePath = '', cityId) {
  const lower = String(linePath || '').toLowerCase();

  // 1. Se o próprio lineRoutesPath carrega explicitamente o slug da cidade, respeita o slug
  for (const [idStr, profile] of Object.entries(CITY_PROFILES)) {
    if (profile.slugs.some(slug => lower.includes(`-${slug}-`) || lower.startsWith(`${slug}-`))) {
      return { cityId: Number(idStr), ...profile };
    }
  }

  // 2. Caso contrário, usa o cityId informado quando mapeado
  const numId = cityId === undefined || cityId === null || cityId === '' ? NaN : Number(cityId);
  if (Number.isFinite(numId) && CITY_PROFILES[numId]) {
    return { cityId: numId, ...CITY_PROFILES[numId] };
  }

  // 3. Extrai o nome de qualquer outra cidade do padrão transporte_publico-<Cidade>-<Empresa>-...
  const slugMatch = String(linePath || '').match(/^transporte_publico-([A-Za-z]+)-/);
  if (slugMatch) {
    const humanized = slugMatch[1].replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    if (humanized.toLowerCase() !== 'sorocaba') {
      return {
        cityId: Number.isFinite(numId) ? numId : 0,
        name: humanized,
        state: '',
        slugs: [slugMatch[1].toLowerCase()],
        center: null,
        fallbackWaypoints: CITY_PROFILES[28].fallbackWaypoints
      };
    }
  }

  return { cityId: 35, ...CITY_PROFILES[35] };
}

// 1. Corredores Curados de Alta Precisão de Sorocaba (Waypoints Asfálticos)
const UFSCAR_BAIRRO_WAYPOINTS = [
  [-23.505427, -47.452724], // TSP (Terminal São Paulo) / Leopoldo Machado
  [-23.501500, -47.459000], // Av. Pres. Juscelino Kubitscheck
  [-23.504718, -47.464810], // Av. Moreira César
  [-23.503684, -47.470112], // Av. General Carneiro (Início)
  [-23.506513, -47.483076], // Av. General Carneiro (Vila Lucy)
  [-23.522293, -47.491307], // Av. Dr. Armando Pannunzio 316
  [-23.535000, -47.492000], // Av. Dr. Armando Pannunzio 1700
  [-23.555000, -47.486000], // Rodovia João Leme dos Santos (SP-264)
  [-23.582868, -47.524073]  // UFSCar Campus Sorocaba (Terminal Universitário)
];

const UFSCAR_CENTRO_WAYPOINTS = [
  [-23.582868, -47.524073], // UFSCar Campus Sorocaba (Terminal Universitário)
  [-23.555000, -47.485800], // Rodovia João Leme dos Santos (SP-264 Northbound)
  [-23.525000, -47.491200], // Av. Dr. Armando Pannunzio Northbound
  [-23.508000, -47.484500], // Av. General Carneiro Northbound
  [-23.504718, -47.464810], // Av. Moreira César
  [-23.501500, -47.459000], // Av. Pres. Juscelino Kubitscheck
  [-23.505427, -47.452724]  // TSP (Terminal São Paulo) / Leopoldo Machado
];

const CARANDA_WAYPOINTS = [
  [-23.493889, -47.460833], // TSA (Terminal Santo Antônio)
  [-23.488000, -47.464000], // Av. Brasil
  [-23.470000, -47.468000], // Av. Itavuvu (Início)
  [-23.454000, -47.476000], // Av. Itavuvu (Shopping Cidade)
  [-23.428500, -47.472000], // Terminal BRT Vitória Régia
  [-23.408000, -47.465000], // Parque Tecnológico / Toyota
  [-23.390000, -47.510000]  // George Oetterer / Residencial Carandá
];

const CAMPOLIM_WAYPOINTS = [
  [-23.505427, -47.452724], // TSP
  [-23.502000, -47.451000], // Av. Dom Aguirre
  [-23.513000, -47.465000], // Av. Barão de Tatuí
  [-23.530000, -47.466000], // Av. Antônio Carlos Comitre
  [-23.540000, -47.468000]  // Shopping Iguatemi Esplanada
];

const EDEN_WAYPOINTS = [
  [-23.505427, -47.452724], // TSP
  [-23.489000, -47.435000], // Av. Eng. Carlos Reinaldo Mendes
  [-23.485000, -47.425000], // Paço Municipal / Alto da Boa Vista
  [-23.445000, -47.385000], // Av. Independência / Éden
  [-23.425000, -47.330000]  // Cajuru
];

const WANEL_WAYPOINTS = [
  [-23.493889, -47.460833], // TSA
  [-23.503684, -47.470112], // Av. General Carneiro
  [-23.510000, -47.495000], // Av. Américo Figueiredo
  [-23.485000, -47.510000]  // Wanel Ville
];

// 2. Dicionário de Marcos e Vias para Mapeamento Dinâmico em Sorocaba
const SOROCABA_LANDMARKS = [
  { pattern: /terminal s[aã]o paulo|tsp|leopoldo machado/i, coord: [-23.505427, -47.452724] },
  { pattern: /terminal santo ant[oô]nio|tsa/i, coord: [-23.493889, -47.460833] },
  { pattern: /juscelino kubitscheck|pres.*juscelino/i, coord: [-23.501500, -47.459000] },
  { pattern: /moreira c[eé]sar/i, coord: [-23.504718, -47.464810] },
  { pattern: /general carneiro.*140|gen.*carneiro.*154|gen.*carneiro.*496/i, coord: [-23.503684, -47.470112] },
  { pattern: /general carneiro.*972|gen.*carneiro.*716|gen.*carneiro.*vila lucy/i, coord: [-23.506513, -47.483076] },
  { pattern: /general carneiro.*pra[çc]a oxford|carneiro.*pannunzio/i, coord: [-23.518000, -47.488000] },
  { pattern: /armando pannunzio.*316|pannunzio.*espirito/i, coord: [-23.522293, -47.491307] },
  { pattern: /armando pannunzio.*757|armando pannunzio.*765|armando pannunzio.*776/i, coord: [-23.527991, -47.491401] },
  { pattern: /armando pannunzio.*1700|armando pannunzio.*2527/i, coord: [-23.535000, -47.492000] },
  { pattern: /jo[aã]o leme dos santos.*104|leme dos santos.*1060/i, coord: [-23.548000, -47.493000] },
  { pattern: /jo[aã]o leme dos santos.*106|leme dos santos.*2475/i, coord: [-23.564848, -47.494614] },
  { pattern: /jo[aã]o leme dos santos.*108|leme dos santos.*300/i, coord: [-23.575000, -47.508000] },
  { pattern: /ufscar|terminal universit[aá]rio/i, coord: [-23.582868, -47.524073] },
  { pattern: /afonso vergueiro/i, coord: [-23.495000, -47.465000] },
  { pattern: /avenida brasil|av.*brasil/i, coord: [-23.488000, -47.464000] },
  { pattern: /itavuvu.*shopping|itavuvu.*cidade/i, coord: [-23.454000, -47.476000] },
  { pattern: /itavuvu.*toyota|itavuvu.*tecnol[oó]gico/i, coord: [-23.408000, -47.465000] },
  { pattern: /itavuvu/i, coord: [-23.470000, -47.468000] },
  { pattern: /ipanema.*cruz de ferro/i, coord: [-23.428000, -47.510000] },
  { pattern: /ipanema/i, coord: [-23.465000, -47.480000] },
  { pattern: /bar[aã]o de tatu[ií]/i, coord: [-23.513000, -47.465000] },
  { pattern: /comitre|campolim/i, coord: [-23.530000, -47.466000] },
  { pattern: /iguatemi|esplanada/i, coord: [-23.540000, -47.468000] },
  { pattern: /am[eé]rico figueiredo/i, coord: [-23.510000, -47.495000] },
  { pattern: /wanel ville/i, coord: [-23.485000, -47.510000] },
  { pattern: /carlos reinaldo mendes|reinaldo mendes/i, coord: [-23.489000, -47.435000] },
  { pattern: /pa[çc]o municipal|prefeitura/i, coord: [-23.485000, -47.425000] },
  { pattern: /independ[eê]ncia|[eé]den/i, coord: [-23.445000, -47.385000] },
  { pattern: /aparecidinha/i, coord: [-23.465000, -47.360000] },
  { pattern: /brigadeiro tobias/i, coord: [-23.511000, -47.362000] },
  { pattern: /avenida s[aã]o paulo|av.*s[aã]o paulo/i, coord: [-23.508000, -47.435000] },
  { pattern: /hermelino matarazzo/i, coord: [-23.485000, -47.458000] },
  { pattern: /comendador oetterer/i, coord: [-23.480000, -47.460000] },
  { pattern: /vila carol/i, coord: [-23.475000, -47.465000] }
];

function isWithinCityBounds(coord, center) {
  if (!Array.isArray(coord) || !Number.isFinite(coord[0]) || !Number.isFinite(coord[1])) return false;
  if (!center) return true;
  // ~1.2 graus (~130 km) ao redor do centro metropolitano
  return Math.hypot(coord[0] - center[0], coord[1] - center[1]) <= 1.2;
}

// Identifica a lista ideal de waypoints síncronos para uma linha
function resolveRouteWaypoints(linePath, stops = [], cityId = 35) {
  const hint = extractCityHint(linePath, cityId);
  const isSorocaba = hint.name === 'Sorocaba';
  const lower = String(linePath || '').toLowerCase();

  if (isSorocaba) {
    if (lower.includes('ufscar')) {
      return lower.includes('centro') ? UFSCAR_CENTRO_WAYPOINTS : UFSCAR_BAIRRO_WAYPOINTS;
    }
    if (lower.includes('caranda') || lower.includes('e180') || lower.includes('itavuvu')) {
      return CARANDA_WAYPOINTS;
    }
    if (lower.includes('iguatemi') || lower.includes('campolim') || lower.includes('comitre')) {
      return CAMPOLIM_WAYPOINTS;
    }
    if (lower.includes('eden') || lower.includes('cajuru') || lower.includes('independencia')) {
      return EDEN_WAYPOINTS;
    }
    if (lower.includes('wanel') || lower.includes('cerrado')) {
      return WANEL_WAYPOINTS;
    }

    if (stops && stops.length > 0) {
      const matched = [];
      const seen = new Set();
      stops.forEach(s => {
        const name = (s.name || s.fullName || '').toLowerCase();
        for (const lm of SOROCABA_LANDMARKS) {
          if (lm.pattern.test(name)) {
            const key = `${lm.coord[0].toFixed(3)}_${lm.coord[1].toFixed(3)}`;
            if (!seen.has(key)) {
              seen.add(key);
              matched.push(lm.coord);
            }
            break;
          }
        }
      });

      if (matched.length >= 2) {
        return matched;
      }
    }

    return CITY_PROFILES[35].fallbackWaypoints;
  }

  // Outras cidades: aproveita coordenadas embutidas ou em cache local, sem jamais usar marcos de Sorocaba
  if (stops && stops.length > 0) {
    const cachedMatched = [];
    const seen = new Set();
    for (const s of stops) {
      let coord = null;
      if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
        coord = [s.lat, s.lng];
      } else {
        const cacheEntry =
          (s.stopId && coordsCache[`${hint.cityId}:${s.stopId}`]) ||
          (s.name && coordsCache[`${hint.cityId}:${s.name}`]);
        if (cacheEntry && Number.isFinite(cacheEntry.lat) && Number.isFinite(cacheEntry.lng)) {
          coord = [cacheEntry.lat, cacheEntry.lng];
        }
      }
      if (coord && isWithinCityBounds(coord, hint.center)) {
        const key = `${coord[0].toFixed(3)}_${coord[1].toFixed(3)}`;
        if (!seen.has(key)) {
          seen.add(key);
          cachedMatched.push(coord);
        }
      }
    }
    if (cachedMatched.length >= 2) {
      return cachedMatched;
    }
  }

  return hint.fallbackWaypoints;
}

// Geocodifica até 4 paradas-âncora (origem, terços intermediários e destino) quando resolveStopCoord é fornecido
async function resolveDynamicAnchorWaypoints(linePath, stops = [], cityId = 35, resolveStopCoord = null) {
  const staticWaypoints = resolveRouteWaypoints(linePath, stops, cityId);
  const hint = extractCityHint(linePath, cityId);

  // Se Sorocaba já bateu corredor curado ou marcos suficientes, usa direto sem latência extra
  if (hint.name === 'Sorocaba' && staticWaypoints !== CITY_PROFILES[35].fallbackWaypoints) {
    return staticWaypoints;
  }
  if (hint.name !== 'Sorocaba' && staticWaypoints !== hint.fallbackWaypoints) {
    return staticWaypoints;
  }
  if (typeof resolveStopCoord !== 'function' || !Array.isArray(stops) || stops.length < 2) {
    return staticWaypoints;
  }

  const lastIdx = stops.length - 1;
  const anchorIndices = Array.from(new Set([
    0,
    Math.floor(lastIdx / 3),
    Math.floor((2 * lastIdx) / 3),
    lastIdx
  ]));

  let cacheDirty = false;
  const resolved = await Promise.all(anchorIndices.map(async (idx) => {
    const stop = stops[idx];
    if (!stop) return null;
    if (Number.isFinite(stop.lat) && Number.isFinite(stop.lng)) {
      return [stop.lat, stop.lng];
    }

    const cacheKey = `${hint.cityId}:${stop.stopId || stop.name}`;
    const existing = coordsCache[cacheKey];
    if (existing && Number.isFinite(existing.lat) && Number.isFinite(existing.lng)) {
      return [existing.lat, existing.lng];
    }

    const rawName = (stop.name || stop.fullName || '').trim();
    if (!rawName || /^terminal \/ esta|^parada de embarque/i.test(rawName)) return null;

    const hasCityInName = hint.name && rawName.toLowerCase().includes(hint.name.toLowerCase());
    const suffix = hint.name ? (hint.state ? `${hint.name} - ${hint.state}` : hint.name) : '';
    const query = hasCityInName || !suffix ? rawName : `${rawName}, ${suffix}`;

    const coord = await resolveStopCoord(query);
    if (coord && isWithinCityBounds(coord, hint.center)) {
      coordsCache[cacheKey] = {
        stopId: stop.stopId || null,
        name: rawName,
        lat: coord[0],
        lng: coord[1],
        updatedAt: Date.now()
      };
      cacheDirty = true;
      return coord;
    }
    return null;
  }));

  if (cacheDirty) saveCoordsCache();

  const deduped = [];
  const seen = new Set();
  for (const coord of resolved) {
    if (!coord) continue;
    const key = `${coord[0].toFixed(3)}_${coord[1].toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(coord);
    }
  }

  return deduped.length >= 2 ? deduped : staticWaypoints;
}

// Remove loops, retornos e pontas-mortas (auto-reversões de 180° causadas por waypoints no sentido oposto)
function removeSpikesAndLoops(polyline) {
  if (!polyline || polyline.length < 3) return polyline || [];

  const cleaned = [];
  let i = 0;
  const n = polyline.length;

  while (i < n) {
    const pt = polyline[i];
    let foundLoop = false;

    // Busca até 80 pontos à frente para detectar laços de auto-reversão
    const maxLookahead = Math.min(n - 1, i + 80);
    for (let j = maxLookahead; j >= i + 4; j--) {
      const target = polyline[j];
      const d = Math.hypot(pt[0] - target[0], pt[1] - target[1]);
      if (d < 0.0004) {
        cleaned.push(pt);
        i = j; // Pula o laço / spike
        foundLoop = true;
        break;
      }
    }

    if (!foundLoop) {
      cleaned.push(pt);
      i++;
    }
  }

  return cleaned;
}

// 3. Gerar Rota Contínua Asfáltica (OSRM Multi-Waypoint)
async function getRoadRouteGeometry(linePath, cityId = 35, stops = [], options = {}) {
  const cacheKey = `v6:${cityId}:${linePath}`;
  if (routesCache[cacheKey]) {
    return routesCache[cacheKey];
  }

  const waypoints = await resolveDynamicAnchorWaypoints(linePath, stops, cityId, options.resolveStopCoord);

  try {
    const coordsStr = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&continue_straight=true`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Nexto-ITS-RoadSnap/5.0' },
      timeout: 10000
    });

    if (res.data && res.data.routes && res.data.routes[0]) {
      const rawCoords = res.data.routes[0].geometry.coordinates;
      // Converte [lng, lat] para [lat, lng]
      const rawPoly = rawCoords.map(([lng, lat]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
      // Remove spikes e loops de U-turn nas vias expressas
      const polyline = removeSpikesAndLoops(rawPoly);

      routesCache[cacheKey] = polyline;
      saveRoutesCache();
      return polyline;
    }
  } catch (err) {
    console.warn(`[OSRM Precision] Falha na consulta OSRM para ${linePath}:`, err.message);
  }

  // Fallback suave através dos waypoints reais sem atalhos fora das vias
  const fallbackPolyline = [];
  for (let w = 0; w < waypoints.length - 1; w++) {
    const [lat1, lng1] = waypoints[w];
    const [lat2, lng2] = waypoints[w + 1];
    const steps = 15;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      fallbackPolyline.push([
        Number((lat1 + (lat2 - lat1) * t).toFixed(6)),
        Number((lng1 + (lng2 - lng1) * t).toFixed(6))
      ]);
    }
  }

  routesCache[cacheKey] = fallbackPolyline;
  saveRoutesCache();
  return fallbackPolyline;
}

// Encontra o ponto mais próximo sobre o traçado viário da polyline
function findClosestPolylinePoint(targetLat, targetLng, polyline, minIdx = 0, maxIdx = polyline.length - 1) {
  let closest = polyline[minIdx];
  let minD = Infinity;
  for (let i = minIdx; i <= maxIdx; i++) {
    const pt = polyline[i];
    const d = (pt[0] - targetLat) ** 2 + (pt[1] - targetLng) ** 2;
    if (d < minD) {
      minD = d;
      closest = pt;
    }
  }
  return closest;
}

// 5. Mapeamento Topológico de Paradas ao Longo do Traçado Asfáltico (Monótono e Sequencial)
async function mapStopsAlongRoadRoute(stops, linePath, cityId = 35, options = {}) {
  const polyline = await getRoadRouteGeometry(linePath, cityId, stops, options);
  const totalStops = stops.length;

  if (totalStops === 0) return { stops: [], polyline };

  // Distribuição proporcional rigorosamente monótona ao longo do traçado asfáltico
  const mappedStops = stops.map((stop, i) => {
    const idx = typeof stop.index === 'number' ? stop.index : i;
    const ratio = totalStops > 1 ? idx / (totalStops - 1) : 0.5;
    const ptIndex = Math.min(
      polyline.length - 1,
      Math.floor(ratio * (polyline.length - 1))
    );
    const [lat, lng] = polyline[ptIndex];

    return {
      ...stop,
      lat,
      lng
    };
  });

  return {
    stops: mappedStops,
    polyline
  };
}

module.exports = {
  extractCityHint,
  resolveRouteWaypoints,
  removeSpikesAndLoops,
  findClosestPolylinePoint,
  getRoadRouteGeometry,
  mapStopsAlongRoadRoute
};
