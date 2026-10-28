const axios = require('axios');
const protobuf = require('protobufjs');
const path = require('path');
const cache = require('./cache');
const stopGeocoder = require('./stopGeocoder');

const TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6";
const CORE_BASE = "https://core.cittamobi.com.br";
const CONTENT_BASE = "https://linhas.cittamobi.com.br";

const httpClient = axios.create({
  baseURL: CORE_BASE,
  headers: {
    "username": TOKEN,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://linhas.cittamobi.com.br/"
  },
  responseType: "arraybuffer",
  timeout: 10000
});

let protoRoot = null;
let protoTypes = {};

async function initProto() {
  if (protoRoot) return;
  const protoPath = path.join(__dirname, '..', 'proto', 'cittamobi_core.proto');
  protoRoot = await protobuf.load(protoPath);
  protoTypes = {
    CitiesProto: protoRoot.lookupType("br.com.cittamobi.core.CitiesProto"),
    LineRoutesServiceSearchesProto: protoRoot.lookupType("br.com.cittamobi.core.LineRoutesServiceSearchesProto"),
    ServicePredictionsProto: protoRoot.lookupType("br.com.cittamobi.core.ServicePredictionsProto"),
    PlacesSearchProto: protoRoot.lookupType("br.com.cittamobi.core.PlacesSearchProto"),
    PlacesLocationProto: protoRoot.lookupType("br.com.cittamobi.core.PlacesLocationProto"),
    TripPlanDataProto: protoRoot.lookupType("br.com.cittamobi.core.TripPlanDataProto")
  };
}

// 1. Busca de cidades por nome
async function searchCities(name) {
  await initProto();
  const cacheKey = `cities:${name.toLowerCase().trim()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `/predigo/city/proto/search?name=${encodeURIComponent(name.trim())}`;
  const response = await httpClient.get(url);
  
  const decoded = protoTypes.CitiesProto.decode(new Uint8Array(response.data));
  const result = protoTypes.CitiesProto.toObject(decoded, { defaults: true });
  
  const cities = result.cities || [];
  // Cache por 12 horas
  cache.set(cacheKey, cities, 12 * 60 * 60 * 1000);
  return cities;
}

// 2. Busca de todas as linhas de uma cidade por cityId
async function getLinesByCityId(cityId) {
  await initProto();
  const cacheKey = `lines:city:${cityId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `/linesroutes/service/city/all?cityId=${cityId}`;
  const response = await httpClient.get(url);

  const decoded = protoTypes.LineRoutesServiceSearchesProto.decode(new Uint8Array(response.data));
  const result = protoTypes.LineRoutesServiceSearchesProto.toObject(decoded, { defaults: true });

  const lines = result.searchResult || [];
  // Cache por 2 horas
  cache.set(cacheKey, lines, 2 * 60 * 60 * 1000);
  return lines;
}

// 3. Previsão em tempo real de uma parada e linha
async function getStopPredictions(serviceId, stopId) {
  await initProto();
  const cacheKey = `pred:${serviceId}:${stopId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `/linesroutes/service/predictions?serviceId=${encodeURIComponent(serviceId)}&stopId=${encodeURIComponent(stopId)}`;
  const response = await httpClient.get(url);

  const decoded = protoTypes.ServicePredictionsProto.decode(new Uint8Array(response.data));
  const result = protoTypes.ServicePredictionsProto.toObject(decoded, { defaults: true });

  // Normalização do payload
  const normalized = {
    routeCode: result.routeCode || "",
    routeMnemonic: result.routeMnemonic || "",
    serviceMnemonic: result.serviceMnemonic || "",
    companyId: result.companyId || "",
    serviceId: result.serviceId || serviceId,
    stopId: result.stopId || stopId,
    activeVehicles: result.activeVehicles || 0,
    scheduledVehicles: result.scheduledVehicles || 0,
    hasRealTime: !!result.hasRealTime,
    estimatedInterval: result.estimatedInterval || 0,
    totalTravelTimeUntilStopSeconds: result.totalTravelTimeUntilStopSeconds || 0,
    vehicles: (result.vehicles || []).map(v => ({
      vehicleId: v.vehicleId || "",
      licensePlate: v.licensePlate || "",
      secondsUntilArrival: v.secondsUntilArrival || 0,
      minutesUntilArrival: v.minutesUntilArrival || Math.floor((v.secondsUntilArrival || 0) / 60),
      estimatedArrivalTime: v.estimatedArrivalTime || 0,
      scheduledTime: v.scheduledTime || 0,
      status: v.status || "",
      currentLat: v.currentLat || 0,
      currentLng: v.currentLng || 0,
      isRealTime: !!v.isRealTime,
      sequence: v.sequence || 0
    }))
  };

  // Cache por 15 segundos para tempo real
  cache.set(cacheKey, normalized, 15 * 1000);
  return normalized;
}

// 4. Autocomplete de endereços e paradas
async function autocompletePlaces(term, lat, lng) {
  await initProto();
  const cacheKey = `auto:${term.toLowerCase()}:${lat || ''}:${lng || ''}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let url = `/tripplanner/proto/autocomplete?term=${encodeURIComponent(term)}`;
  if (lat && lng) {
    url += `&lat=${lat}&lng=${lng}`;
  }
  const response = await httpClient.get(url);

  const decoded = protoTypes.PlacesSearchProto.decode(new Uint8Array(response.data));
  const result = protoTypes.PlacesSearchProto.toObject(decoded, { defaults: true });

  const places = result.places || [];
  // Cache por 1 hora
  cache.set(cacheKey, places, 60 * 60 * 1000);
  return places;
}

// 4.5. Resolver coordenadas geográficas por id/key do local
async function resolvePlace(text, key) {
  await initProto();
  const cacheKey = `place-key:${key}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `/tripplanner/proto/place/key?text=${encodeURIComponent(text)}&key=${encodeURIComponent(key)}`;
  const response = await httpClient.get(url);

  const decoded = protoTypes.PlacesLocationProto.decode(new Uint8Array(response.data));
  const result = protoTypes.PlacesLocationProto.toObject(decoded, { defaults: true });

  // Cache por 7 dias
  cache.set(cacheKey, result, 7 * 24 * 60 * 60 * 1000);
  return result;
}

// Função utilitária para higienização e padronização dos nomes e endereços de paradas
function cleanStopAddress(rawAddress, linePath, index, totalStops) {
  if (!rawAddress || typeof rawAddress !== 'string') {
    rawAddress = '';
  }

  let addr = rawAddress.trim();

  // 1. Remove tags HTML residuais
  addr = addr.replace(/<[^>]+>/g, '').trim();

  // 2. Remove prefixos numéricos de código operacional (ex: "0169 - ")
  addr = addr.replace(/^\d{3,5}\s*-\s*/, '').trim();

  // 3. Normalização de paradas sem nome / "Unnamed Road"
  const lower = addr.toLowerCase();
  const lowerPath = (linePath || '').toLowerCase();
  if (!addr || lower.includes('unnamed road') || lower.includes('sem nome') || lower === 'sorocaba - sp, brasil') {
    if (lowerPath.includes('ufscar') || lowerPath.includes('universidade')) {
      addr = 'UFSCar - Campus Sorocaba (Terminal Universitário)';
    } else if (index === 0) {
      addr = 'Terminal / Estação de Origem';
    } else if (totalStops > 0 && index === totalStops - 1) {
      addr = 'Terminal / Estação de Destino';
    } else {
      addr = `Parada de Embarque #${index + 1}`;
    }
  }

  // 4. Correção e padronização do viário de Sorocaba
  addr = addr.replace(/SP-079,\s*1970/i, 'Av. Dr. Armando Pannunzio, 1970');
  addr = addr.replace(/SP-079,\s*825-901/i, 'Av. Dr. Armando Pannunzio, 825-901');
  addr = addr.replace(/SP-079,\s*319/i, 'Av. Dr. Armando Pannunzio, 319');
  addr = addr.replace(/SP-079,\s*2171/i, 'Av. General Carneiro, 2171');
  addr = addr.replace(/\bSP-079\b/i, 'Rod. João Leme dos Santos (SP-079)');

  // Padronização de prefixos de vias
  addr = addr.replace(/\bGeneral Carneiro,\s*140/i, 'Av. General Carneiro, 140');
  addr = addr.replace(/\bAv\.\s*Gen\.\s*/i, 'Av. General ');
  addr = addr.replace(/\bAv\.\s*Gal\.\s*/i, 'Av. General ');
  addr = addr.replace(/\bAv\.\s*Pres\.\s*/i, 'Av. Presidente ');
  addr = addr.replace(/\bRod\.\s*/i, 'Rod. ');
  addr = addr.replace(/\bnº\s*/gi, '');
  addr = addr.replace(/\b,\s*sn\b/i, ' (s/n)');

  // Limpeza de pontuação duplicada
  addr = addr.replace(/,{2,}/g, ',');

  // 5. Limpeza de CEP, País e redundâncias
  addr = addr.replace(/,\s*\d{5}-?\d{3}/g, '');
  addr = addr.replace(/,\s*Brasil$/i, '');
  addr = addr.replace(/,\s*São Paulo$/i, '');

  return addr.trim();
}

// 5. Obter detalhes da linha (paradas, itinerário, serviceId) a partir do lineRoutesPath
async function getLineDetails(lineRoutesPath) {
  const cacheKey = `line-details:v2:${lineRoutesPath}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `${CONTENT_BASE}/lines/${lineRoutesPath}.html`;
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    timeout: 10000
  });

  const html = Buffer.from(response.data).toString('utf-8');

  // Extrair serviceId e agencyId
  const serviceIdMatch = html.match(/id=["']serviceId["'][^>]*value=["']([^"']+)["']/i);
  const agencyIdMatch = html.match(/id=["']agencyId["'][^>]*value=["']([^"']+)["']/i);
  const serviceId = serviceIdMatch ? serviceIdMatch[1] : null;
  const agencyId = agencyIdMatch ? agencyIdMatch[1] : null;

  // Extrair horários programados do script JSON
  let schedule = {};
  const schedMatch = html.match(/<script[^>]*>\s*(\{"0":\[.*?\]\})\s*<\/script>/s);
  if (schedMatch) {
    try {
      schedule = JSON.parse(schedMatch[1]);
    } catch (e) {
      // Ignorar falha no parse do cronograma
    }
  }

  // Extrair paradas (data-stop-id)
  const stopRegex = /<div[^>]*data-stop-id=["']([^"']+)["'][^>]*>(.*?)<\/div>\s*<\/div>\s*<\/div>/gs;
  const rawStops = [];
  let match;
  while ((match = stopRegex.exec(html)) !== null) {
    rawStops.push({
      stopId: match[1],
      rawContent: match[2]
    });
  }

  const totalStops = rawStops.length;
  const stops = rawStops.map((item, index) => {
    const stopId = item.stopId;
    const rawContent = item.rawContent;

    // Extrai o nome / endereço da parada com prioridade para stop-name
    let address = "";
    const nameMatch = rawContent.match(/<p[^>]*class=["'][^"']*stop-name[^"']*["'][^>]*>(.*?)<\/p>/i);
    const addrMatch = rawContent.match(/<span[^>]*class=["'][^"']*stop-address[^"']*["'][^>]*>(.*?)<\/span>/i);

    if (nameMatch) {
      address = nameMatch[1].replace(/<[^>]+>/g, '').trim();
    } else if (addrMatch) {
      address = addrMatch[1].replace(/<[^>]+>/g, '').trim();
    } else {
      const cleaned = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const parts = cleaned.split('--');
      address = parts[0].trim();
    }

    const cleanName = cleanStopAddress(address, lineRoutesPath, index, totalStops);

    return {
      index,
      stopId,
      name: cleanName,
      fullName: cleanName,
      mapImage: `${CONTENT_BASE}/maps/stop-${stopId}-v2.webp`,
      departures: schedule[String(index)] || schedule[index] || []
    };
  });

  const result = {
    lineRoutesPath,
    serviceId,
    agencyId,
    lineMapImage: `${CONTENT_BASE}/maps/${lineRoutesPath}.webp`,
    stopsCount: stops.length,
    stops
  };

  // Cache por 6 horas
  cache.set(cacheKey, result, 6 * 60 * 60 * 1000);
  return result;
}

// 6. Rastreamento e Telemetria em Tempo Real de todos os ônibus e paradas da linha
async function getLineTracking(lineRoutesPath, serviceId, cityId = 35) {
  const details = await getLineDetails(lineRoutesPath);
  const targetServiceId = serviceId || details.serviceId;
  const stops = details.stops || [];

  // Resolver coordenadas rodoviárias contínuas (OSRM) para traçado e paradas sem zig-zags
  const { stops: geoStops, polyline } = await stopGeocoder.mapStopsAlongRoadRoute(stops, lineRoutesPath, cityId);

  // Amostrar previsões em tempo real ao longo do corredor
  const vehiclesMap = new Map();
  if (targetServiceId && geoStops.length > 0) {
    const step = Math.max(1, Math.floor(geoStops.length / 12));
    const sampledStops = [];
    for (let i = 0; i < geoStops.length; i += step) {
      sampledStops.push(geoStops[i]);
    }
    if (!sampledStops.includes(geoStops[0])) sampledStops.unshift(geoStops[0]);
    const lastStop = geoStops[geoStops.length - 1];
    if (!sampledStops.includes(lastStop)) sampledStops.push(lastStop);

    await Promise.all(sampledStops.map(async (stop) => {
      try {
        const pred = await getStopPredictions(targetServiceId, stop.stopId);
        if (pred && pred.vehicles) {
          pred.vehicles.forEach(v => {
            // Filtrar estritamente apenas veículos com telemetria ativa em tempo real (isRealTime === true)
            // Desconsidera viagens teóricas / estimativas de cronograma sem ônibus físico na rua
            if (!v.isRealTime) return;

            const existing = vehiclesMap.get(v.vehicleId);
            if (!existing || v.secondsUntilArrival < existing.secondsUntilArrival) {
              vehiclesMap.set(v.vehicleId, {
                ...v,
                targetStopIndex: stop.index,
                targetStopName: stop.name,
                targetStopCoords: [stop.lat, stop.lng]
              });
            }
          });
        }
      } catch (e) {}
    }));
  }

  // Projetar coordenadas geográficas precisas dos veículos sobre o traçado viário
  const activeVehicles = Array.from(vehiclesMap.values()).map(v => {
    const targetIdx = v.targetStopIndex;
    const targetStop = geoStops[targetIdx] || geoStops[0];

    // Se o veículo já possui GPS nativo válido transmitido
    if (v.currentLat && v.currentLng && v.currentLat !== 0) {
      return {
        vehicleId: v.vehicleId,
        licensePlate: v.licensePlate || `PR-${v.vehicleId}`,
        lat: v.currentLat,
        lng: v.currentLng,
        isRealTime: true,
        secondsUntilArrival: v.secondsUntilArrival,
        minutesUntilArrival: v.minutesUntilArrival,
        status: v.secondsUntilArrival <= 60 ? 'APPROACHING' : 'IN_TRANSIT',
        nextStopIndex: targetIdx,
        nextStopName: targetStop.name
      };
    }

    // Projetar posição precisa sobre o asfalto (polyline) a montante da targetStop
    // Velocidade de deslocamento urbano: ~22 km/h (~6.2 m/s)
    const distMeters = Math.min(3000, Math.max(25, (v.secondsUntilArrival || 60) * 6.2));

    // Encontra o ponto na polyline correspondente à parada de destino
    let targetPtIdx = 0;
    let minD = Infinity;
    polyline.forEach((pt, idx) => {
      const d = Math.hypot(pt[0] - targetStop.lat, pt[1] - targetStop.lng);
      if (d < minD) {
        minD = d;
        targetPtIdx = idx;
      }
    });

    // Retrocede na polyline na direção do percurso real
    let remainingMeters = distMeters;
    let currentIdx = targetPtIdx;
    while (currentIdx > 0 && remainingMeters > 0) {
      const p1 = polyline[currentIdx];
      const p0 = polyline[currentIdx - 1];
      const segmentDist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * 111000;
      if (segmentDist >= remainingMeters) {
        const ratio = remainingMeters / (segmentDist || 1);
        const vLat = p1[0] - (p1[0] - p0[0]) * ratio;
        const vLng = p1[1] - (p1[1] - p0[1]) * ratio;
        return {
          vehicleId: v.vehicleId,
          licensePlate: v.licensePlate || `PR-${v.vehicleId}`,
          lat: Number(vLat.toFixed(6)),
          lng: Number(vLng.toFixed(6)),
          isRealTime: true,
          secondsUntilArrival: v.secondsUntilArrival,
          minutesUntilArrival: v.minutesUntilArrival,
          status: v.secondsUntilArrival <= 60 ? 'APPROACHING' : 'IN_TRANSIT',
          nextStopIndex: targetIdx,
          nextStopName: targetStop.name
        };
      }
      remainingMeters -= segmentDist;
      currentIdx--;
    }

    const fallbackPt = polyline[currentIdx] || [targetStop.lat, targetStop.lng];
    return {
      vehicleId: v.vehicleId,
      licensePlate: v.licensePlate || `PR-${v.vehicleId}`,
      lat: Number(fallbackPt[0].toFixed(6)),
      lng: Number(fallbackPt[1].toFixed(6)),
      isRealTime: true,
      secondsUntilArrival: v.secondsUntilArrival,
      minutesUntilArrival: v.minutesUntilArrival,
      status: v.secondsUntilArrival <= 60 ? 'APPROACHING' : 'IN_TRANSIT',
      nextStopIndex: targetIdx,
      nextStopName: targetStop.name
    };
  });

  return {
    serviceId: targetServiceId,
    lineRoutesPath,
    stopsCount: geoStops.length,
    stops: geoStops,
    polyline,
    vehiclesCount: activeVehicles.length,
    vehicles: activeVehicles,
    telemetryTimestamp: new Date().toISOString()
  };
}

module.exports = {
  searchCities,
  getLinesByCityId,
  getStopPredictions,
  autocompletePlaces,
  resolvePlace,
  getLineDetails,
  getLineTracking
};
