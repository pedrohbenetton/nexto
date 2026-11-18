// Lógica pura do Modo TV / Painel Indoor do Nexto

export function parseTvParams(search = '') {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  const stopId = query.get('stopId') || query.get('stop') || null;
  const stopName = query.get('stopName') || query.get('address') || '';
  const cityIdRaw = query.get('cityId') || query.get('city');
  const cityId = cityIdRaw ? parseInt(cityIdRaw, 10) : 35;
  const cityName = query.get('cityName') || 'Sorocaba';
  const title = query.get('title') || (stopName ? `Ponto ${stopName.split(',')[0].trim()}` : 'Painel de Transporte');

  const rawLines = query.get('lines') || query.get('routes') || '';
  const lines = rawLines
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  const serviceId = query.get('serviceId') || null;
  const lineRoutesPath = query.get('lineRoutesPath') || query.get('path') || null;
  const notice = query.get('notice') || query.get('aviso') || '';
  const theme = query.get('theme') || 'dark';

  const isConfigured = Boolean(stopId || lineRoutesPath || lines.length > 0 || (query.get('title') && stopName));

  return {
    stopId,
    stopName,
    cityId: Number.isFinite(cityId) ? cityId : 35,
    cityName,
    title,
    lines,
    serviceId,
    lineRoutesPath,
    notice,
    theme,
    isConfigured
  };
}

export function buildTvUrl(params = {}, baseUrl = '') {
  const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  const sp = new URLSearchParams();

  if (params.stopId) sp.set('stopId', params.stopId);
  if (params.stopName) sp.set('stopName', params.stopName);
  if (params.cityId) sp.set('cityId', String(params.cityId));
  if (params.cityName) sp.set('cityName', params.cityName);
  if (params.title) sp.set('title', params.title);

  if (Array.isArray(params.lines) && params.lines.length > 0) {
    sp.set('lines', params.lines.join(','));
  }
  if (params.serviceId) sp.set('serviceId', params.serviceId);
  if (params.lineRoutesPath) sp.set('lineRoutesPath', params.lineRoutesPath);
  if (params.notice) sp.set('notice', params.notice);

  const qs = sp.toString();
  return `${cleanBase}/tv${qs ? `?${qs}` : ''}`;
}

export function buildMobileQrUrl(params = {}, origin = '') {
  const cleanOrigin = origin ? origin.replace(/\/+$/, '') : '';
  const sp = new URLSearchParams();

  if (params.stopId) sp.set('stopId', params.stopId);
  if (params.cityId) sp.set('cityId', String(params.cityId));
  if (params.cityName) sp.set('city', params.cityName);
  if (params.stopName) sp.set('ponto', params.stopName.split(',')[0].trim());

  sp.set('ref', 'tv');
  sp.set('utm_source', 'nexto_tv');
  sp.set('utm_medium', 'qr_code');

  const qs = sp.toString();
  return `${cleanOrigin}/${qs ? `?${qs}` : ''}`;
}

export function formatTvCountdown(secondsUntilArrival, minutesUntilArrival, isRealTime = true, scheduledClock = '') {
  if (!isRealTime) {
    return {
      status: 'scheduled',
      text: scheduledClock || 'Programado',
      subtext: 'Horário Previsto',
      badge: 'Tabela',
      pulse: false
    };
  }

  const sec = typeof secondsUntilArrival === 'number' ? secondsUntilArrival : 0;
  const min = typeof minutesUntilArrival === 'number' ? minutesUntilArrival : Math.floor(sec / 60);

  if (sec <= 60 || min <= 0) {
    return {
      status: 'arriving',
      text: 'Chegando',
      subtext: 'No ponto ou próximo',
      badge: 'GPS AO VIVO',
      pulse: true
    };
  }

  if (min <= 5) {
    return {
      status: 'imminent',
      text: `${min} min`,
      subtext: `${min} min restantes`,
      badge: 'GPS AO VIVO',
      pulse: true
    };
  }

  return {
    status: 'normal',
    text: `${min} min`,
    subtext: `Aprox. ${Math.round(min)} minutos`,
    badge: 'GPS AO VIVO',
    pulse: false
  };
}

export function getNextScheduledArrival(departures = [], now = new Date()) {
  if (!Array.isArray(departures) || departures.length === 0) return null;

  const currentH = now.getHours();
  const currentM = now.getMinutes();
  const currentTotal = currentH * 60 + currentM;

  // Encontra primeiro horário hoje maior que agora
  for (const dep of departures) {
    const parts = String(dep).split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        const depTotal = h * 60 + m;
        if (depTotal >= currentTotal) {
          return dep;
        }
      }
    }
  }

  // Se todos os horários de hoje já passaram, retorna a primeira viagem de amanhã
  return departures[0] || null;
}

export function aggregateTvDepartures({
  liveVehicles = [],
  scheduledLines = [],
  linesFilter = [],
  now = new Date()
}) {
  const filterSet = new Set(
    (Array.isArray(linesFilter) ? linesFilter : [])
      .map(s => String(s || '').trim().toUpperCase())
      .filter(Boolean)
  );

  const shouldInclude = (code) => {
    if (filterSet.size === 0) return true;
    const clean = String(code || '').trim().toUpperCase();
    return filterSet.has(clean) || Array.from(filterSet).some(f => clean.includes(f));
  };

  const results = [];
  const coveredLines = new Set();

  // 1. Veículos com GPS ativo em tempo real
  for (const v of liveVehicles) {
    if (!shouldInclude(v.routeCode)) continue;

    const cd = formatTvCountdown(v.secondsUntilArrival, v.minutesUntilArrival, true);
    results.push({
      id: v.vehicleId || `live-${v.routeCode}-${Math.random()}`,
      routeCode: v.routeCode || '',
      routeMnemonic: v.routeMnemonic || '',
      serviceMnemonic: v.serviceMnemonic || '',
      lineRoutesPath: v.lineRoutesPath || '',
      timeText: cd.text,
      status: cd.status,
      badge: cd.badge,
      pulse: cd.pulse,
      isRealTime: true,
      secondsUntilArrival: v.secondsUntilArrival || 0,
      minutesUntilArrival: v.minutesUntilArrival || 0,
      licensePlate: v.licensePlate || '',
      bgColor: v.bgColor || '',
      fgColor: v.fgColor || ''
    });
    coveredLines.add(String(v.routeCode).toUpperCase());
  }

  // 2. Linhas programadas (caso não haja veículo ao vivo na rua para aquela rota agora)
  for (const s of scheduledLines) {
    if (!shouldInclude(s.routeCode)) continue;
    // Se já temos veículo com GPS ao vivo recente para essa linha, não precisa duplicar com horário de tabela
    if (coveredLines.has(String(s.routeCode).toUpperCase())) continue;

    const nextClock = getNextScheduledArrival(s.departures, now);
    if (!nextClock) continue;

    const cd = formatTvCountdown(0, 0, false, nextClock);
    results.push({
      id: `sched-${s.routeCode}`,
      routeCode: s.routeCode || '',
      routeMnemonic: s.routeMnemonic || '',
      serviceMnemonic: s.serviceMnemonic || '',
      lineRoutesPath: s.lineRoutesPath || '',
      timeText: cd.text,
      status: cd.status,
      badge: cd.badge,
      pulse: cd.pulse,
      isRealTime: false,
      secondsUntilArrival: 999999,
      minutesUntilArrival: 999999,
      licensePlate: '',
      bgColor: s.bgColor || '',
      fgColor: s.fgColor || ''
    });
  }

  // Ordena: chegadas iminentes ao vivo primeiro, seguidas pelos horários futuros
  results.sort((a, b) => {
    if (a.isRealTime && !b.isRealTime) return -1;
    if (!a.isRealTime && b.isRealTime) return 1;
    return a.secondsUntilArrival - b.secondsUntilArrival;
  });

  return results;
}
