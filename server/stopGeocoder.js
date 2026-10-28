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
  } catch (e) {
    coordsCache = {};
    routesCache = {};
  }
}
initCaches();

function saveRoutesCache() {
  try {
    fs.writeFileSync(ROUTES_CACHE_FILE, JSON.stringify(routesCache, null, 2), 'utf-8');
  } catch (e) {}
}

// 1. Corredores Curados de Alta Precisão (Waypoints Asfálticos)
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

// 2. Dicionário de Marcos e Vias para Mapeamento Dinâmico de Qualquer Linha
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

// Identifica a lista ideal de waypoints para uma linha
function resolveRouteWaypoints(linePath, stops = []) {
  const lower = linePath.toLowerCase();

  // Linha 80 UFSCar
  if (lower.includes('ufscar')) {
    if (lower.includes('centro')) {
      return UFSCAR_CENTRO_WAYPOINTS;
    }
    return UFSCAR_BAIRRO_WAYPOINTS;
  }

  // Linhas da Zona Norte (Carandá, Itavuvu, E180, etc.)
  if (lower.includes('caranda') || lower.includes('e180') || lower.includes('itavuvu')) {
    return CARANDA_WAYPOINTS;
  }

  // Linhas Campolim / Iguatemi (65, 56, etc.)
  if (lower.includes('iguatemi') || lower.includes('campolim') || lower.includes('comitre')) {
    return CAMPOLIM_WAYPOINTS;
  }

  // Linhas Éden / Zona Industrial / Cajuru
  if (lower.includes('eden') || lower.includes('cajuru') || lower.includes('independencia')) {
    return EDEN_WAYPOINTS;
  }

  // Linhas Wanel Ville / Cerrado
  if (lower.includes('wanel') || lower.includes('cerrado')) {
    return WANEL_WAYPOINTS;
  }

  // Mapeamento dinâmico baseado nos endereços das paradas da própria linha
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

  // Padrão Sorocaba: Terminal São Paulo -> Região Noroeste
  return [
    [-23.505427, -47.452724],
    [-23.501500, -47.459000],
    [-23.493889, -47.460833]
  ];
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
async function getRoadRouteGeometry(linePath, cityId = 35, stops = []) {
  const cacheKey = `v5:${cityId}:${linePath}`;
  if (routesCache[cacheKey]) {
    return routesCache[cacheKey];
  }

  const waypoints = resolveRouteWaypoints(linePath, stops);

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
    const d = (pt[0] - targetLat)**2 + (pt[1] - targetLng)**2;
    if (d < minD) {
      minD = d;
      closest = pt;
    }
  }
  return closest;
}

// 5. Mapeamento Topológico de Paradas ao Longo do Traçado Asfáltico (Monótono e Sequencial)
async function mapStopsAlongRoadRoute(stops, linePath, cityId = 35) {
  const polyline = await getRoadRouteGeometry(linePath, cityId, stops);
  const totalStops = stops.length;

  if (totalStops === 0) return { stops: [], polyline };

  // Distribuição proporcional rigorosamente monótona ao longo do traçado asfáltico
  // Garante que cada parada sucessiva avança sobre a via sem retrocessos ou laços residenciais
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
  getRoadRouteGeometry,
  mapStopsAlongRoadRoute
};
