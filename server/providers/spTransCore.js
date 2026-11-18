/**
 * spTransCore.js
 * Funções puras de transformação para integração oficial com a API Olho Vivo da SPTrans (v2.1).
 * Totalmente desacopladas de I/O para facilitar testes determinísticos de alta velocidade.
 */

/**
 * Converte o formato de linha do Olho Vivo da SPTrans para o modelo Nexto
 * @param {object} item - Linha bruta da SPTrans
 * @returns {object} Linha no formato Nexto
 */
function parseOlhoVivoLine(item) {
  if (!item || typeof item !== 'object') return null;

  const cl = item.cl;
  const lt = String(item.lt || '').trim();
  const tl = item.tl ? String(item.tl).trim() : '';
  const routeCode = tl && tl !== '0' ? `${lt}-${tl}` : lt;
  const sl = Number(item.sl) || 1;

  // Sentido 1: Terminal Principal -> Secundário; Sentido 2: Secundário -> Principal
  const tp = String(item.tp || '').trim();
  const ts = String(item.ts || '').trim();
  const routeMnemonic = sl === 2 && ts ? ts : tp;
  const serviceMnemonic = sl === 2 && tp ? tp : ts;

  const tags = ['SPTrans', 'Olho Vivo', 'Oficial'];
  if (item.lc) {
    tags.push('CIRCULAR');
  }

  return {
    id: `gtfs_sp_${cl}`,
    routeCode,
    routeMnemonic,
    serviceMnemonic,
    bgColor: '#e11d48', // Vermelho SPTrans
    fgColor: '#ffffff',
    lineRoutesPath: `gtfs-sp-cl-${cl}`,
    modal: 1,
    companyName: 'SPTrans Olho Vivo',
    tags,
    raw: {
      cl,
      sl,
      circular: Boolean(item.lc)
    }
  };
}

/**
 * Extrai o código da linha (cl) a partir de um lineRoutesPath ou serviceId
 * Suporta formatos: "gtfs-sp-cl-1273", "gtfs-sp-srv-1273", "gtfs-sp-1273"
 * @param {string} path - Caminho ou ID do serviço
 * @returns {number|null} Código da linha na SPTrans ou null se não reconhecido
 */
function extractClFromPath(path) {
  if (!path || typeof path !== 'string') return null;
  // Casa formatos canônicos como gtfs-sp-cl-1273, gtfs-sp-srv-1273 ou gtfs-sp-1273
  const match = path.match(/gtfs-sp-(?:cl-|srv-)(\d+)/i) || path.match(/^gtfs-sp-(\d+)$/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Converte array de paradas da SPTrans em modelo de paradas Nexto
 * @param {Array} stopsList - Lista bruta de paradas da SPTrans
 * @returns {Array} Lista padronizada de paradas
 */
function parseOlhoVivoStops(stopsList) {
  if (!Array.isArray(stopsList)) return [];

  return stopsList.map((stop, index) => ({
    index,
    stopId: String(stop.cp || `stop_${index + 1}`),
    name: String(stop.np || `Parada ${index + 1}`).trim(),
    address: String(stop.ed || '').trim(),
    lat: Number(stop.py) || 0,
    lng: Number(stop.px) || 0
  }));
}

/**
 * Converte string de horário "HH:MM" para minutos desde 00:00
 * @param {string} timeStr - "HH:MM"
 * @returns {number|null} Minutos do dia ou null se inválido
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return (h * 60) + m;
}

/**
 * Calcula a previsão em minutos e segundos comparando horário previsto e de referência
 * @param {string} arrivalTimeStr - Horário previsto (ex: "16:52")
 * @param {string} referenceTimeStr - Horário de referência (ex: "16:45")
 * @returns {{ minutes: number, seconds: number }|null}
 */
function calculateOlhoVivoEta(arrivalTimeStr, referenceTimeStr) {
  const arrivalMin = timeToMinutes(arrivalTimeStr);
  const refMin = timeToMinutes(referenceTimeStr);

  if (arrivalMin === null || refMin === null) return null;

  let diff = arrivalMin - refMin;

  // Tratamento de virada da meia-noite (ex: ref 23:55 e previsão 00:05)
  if (diff < -720) {
    diff += 1440;
  } else if (diff > 720) {
    diff -= 1440;
  }

  // Se o ônibus já passou há mais de 10 minutos ou a previsão é retroativa inconsistente
  if (diff < -5) {
    return null;
  }

  // Se a diferença for negativa pequena (-5 a 0), considera iminente ("Agora")
  const minutes = Math.max(0, diff);
  const seconds = minutes * 60;

  return { minutes, seconds };
}

/**
 * Converte posições em tempo real da SPTrans para veículos rastreados no Nexto
 * @param {object} posicaoData - Dados brutos de /Posicao/Linha
 * @returns {{ vehicles: Array, referenceTime: string }}
 */
function parseOlhoVivoPositions(posicaoData) {
  if (!posicaoData || typeof posicaoData !== 'object') {
    return { vehicles: [], referenceTime: '' };
  }

  const referenceTime = String(posicaoData.hr || '');
  const vs = Array.isArray(posicaoData.vs) ? posicaoData.vs : [];

  const vehicles = vs.map((v) => ({
    vehicleId: `SP-${v.p}`,
    licensePlate: String(v.p),
    lat: Number(v.py) || 0,
    lng: Number(v.px) || 0,
    isRealTime: true,
    accessible: Boolean(v.a),
    timestamp: v.ta || new Date().toISOString(),
    status: 'IN_TRANSIT'
  }));

  return {
    vehicles,
    referenceTime
  };
}

/**
 * Converte a resposta do endpoint /Previsao do Olho Vivo para o schema de previsões do Nexto
 * @param {object} previsaoData - Resposta bruta de /Previsao
 * @param {string|number} [targetCl] - Código de linha opcional para filtrar
 * @returns {object} Previsões no schema padrão Nexto
 */
function parseOlhoVivoPredictions(previsaoData, targetCl = null) {
  if (!previsaoData || !previsaoData.p) {
    return {
      routeCode: 'SPTRANS',
      routeMnemonic: 'SPTrans Olho Vivo',
      serviceMnemonic: 'São Paulo',
      companyId: 'SPTrans',
      serviceId: targetCl ? `gtfs-sp-srv-${targetCl}` : 'gtfs-sp-srv',
      stopId: '',
      activeVehicles: 0,
      scheduledVehicles: 0,
      hasRealTime: false,
      estimatedInterval: 15,
      vehicles: []
    };
  }

  const p = previsaoData.p;
  const refTime = previsaoData.hr || '';
  const stopId = String(p.cp || '');
  const lines = Array.isArray(p.l) ? p.l : [];

  const targetClNum = targetCl ? parseInt(targetCl, 10) : null;
  const matchedLine = lines.find(l => targetClNum === null || l.cl === targetClNum) || lines[0] || {};

  const vehiclesList = [];
  const vs = Array.isArray(matchedLine.vs) ? matchedLine.vs : [];

  for (const v of vs) {
    const eta = calculateOlhoVivoEta(v.t, refTime);
    if (!eta) continue;

    vehiclesList.push({
      vehicleId: `SP-${v.p}`,
      licensePlate: String(v.p),
      secondsUntilArrival: eta.seconds,
      minutesUntilArrival: eta.minutes,
      isRealTime: true,
      currentLat: Number(v.py) || 0,
      currentLng: Number(v.px) || 0,
      accessible: Boolean(v.a),
      predictedTime: v.t
    });
  }

  // Ordena por menor tempo de chegada
  vehiclesList.sort((a, b) => a.secondsUntilArrival - b.secondsUntilArrival);

  return {
    routeCode: matchedLine.c || 'SPTRANS',
    routeMnemonic: matchedLine.lt0 || 'SPTrans',
    serviceMnemonic: matchedLine.lt1 || '',
    companyId: 'SPTrans',
    serviceId: `gtfs-sp-srv-${matchedLine.cl || targetCl || '0'}`,
    stopId,
    activeVehicles: vehiclesList.length,
    scheduledVehicles: 0,
    hasRealTime: vehiclesList.length > 0,
    estimatedInterval: 12,
    vehicles: vehiclesList
  };
}

module.exports = {
  parseOlhoVivoLine,
  extractClFromPath,
  parseOlhoVivoStops,
  timeToMinutes,
  calculateOlhoVivoEta,
  parseOlhoVivoPositions,
  parseOlhoVivoPredictions
};
