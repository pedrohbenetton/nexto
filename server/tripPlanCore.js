// Lógica pura do planejador de rotas (A -> B): monta a requisição e normaliza a resposta.
const DEFAULT_MODES = ['BUS', 'RAIL', 'FERRY'];

// Corpo JSON esperado por POST core.cittamobi.com.br/tripplanner/proto/plan
function buildPlanRequest({ fromLat, fromLng, toLat, toLng, dateTime, arriveBy = false, maxWalkDistance = 1000, modes = DEFAULT_MODES }) {
  return {
    from_lat: fromLat,
    from_lng: fromLng,
    to_lat: toLat,
    to_lng: toLng,
    dateTime: dateTime ?? Date.now(),
    arriveOrDepart: arriveBy ? 1 : 0,
    maxWalkDistance,
    mode: [...modes]
  };
}

// Polyline codificada do Google (precisão 5) -> [[lat, lng], ...]
function decodePolyline(str) {
  if (!str) return [];
  const points = [];
  let index = 0, lat = 0, lng = 0;
  const next = () => {
    let result = 0, shift = 0, byte;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < str.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < str.length) {
    lat += next();
    lng += next();
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

const toIso = ms => (Number(ms) ? new Date(Number(ms)).toISOString() : null);
const minutes = (startMs, endMs) => Math.round((Number(endMs) - Number(startMs)) / 60000) || 0;

function normalizeLeg(leg) {
  const isWalk = leg.mode === 'WALK';
  return {
    mode: leg.mode,
    isWalk,
    lineCode: leg.routeshortname || null,
    lineName: leg.routelongname || leg.route || null,
    headsign: leg.headsign || null,
    color: leg.color || null,
    textColor: leg.textcolor || null,
    startTime: toIso(leg.starttime),
    endTime: toIso(leg.endtime),
    durationMin: minutes(leg.starttime, leg.endtime),
    distanceM: Math.round(leg.distance || 0),
    from: { name: leg.stopfromname || null, lat: leg.stopfromlat ?? null, lng: leg.stopfromlng ?? null },
    to: { name: leg.stoptoname || null, lat: leg.stoptolat ?? null, lng: leg.stoptolng ?? null },
    intermediateStops: leg.intermediatestopsnames || [],
    path: decodePolyline(leg.geometrypoints)
  };
}

function normalizeItinerary(it) {
  const legs = (it.legs || []).map(normalizeLeg);
  const busLegs = legs.filter(l => !l.isWalk).length;
  return {
    durationMin: Math.round(Number(it.duration || 0) / 60),
    startTime: toIso(it.starttime),
    endTime: toIso(it.endtime),
    walkDistanceM: Math.round(it.walkdistance || 0),
    fare: it.fare >= 0 ? it.fare : null,
    transfers: Math.max(0, busLegs - 1),
    legs
  };
}

function normalizeTripPlan(raw) {
  if (raw.haserror) {
    return { hasError: true, errorMessage: raw.errormsg || 'Erro ao calcular itinerário', itineraries: [] };
  }
  return {
    hasError: false,
    errorMessage: null,
    from: { name: raw.fromname || null, lat: raw.fromlat ?? null, lng: raw.fromlng ?? null },
    to: { name: raw.toname || null, lat: raw.tolat ?? null, lng: raw.tolng ?? null },
    itineraries: (raw.itineraries || []).map(normalizeItinerary)
  };
}

module.exports = { DEFAULT_MODES, buildPlanRequest, decodePolyline, normalizeTripPlan };
