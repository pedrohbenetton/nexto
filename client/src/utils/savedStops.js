// "Meus pontos": pares linha (serviceId) + parada salvos pelo usuário.
// A API do Cittamobi só dá previsões por serviço + parada, por isso o par é a unidade salva.
export const MAX_SAVED_STOPS = 8;

const LINE_FIELDS = ['id', 'routeCode', 'routeMnemonic', 'serviceMnemonic', 'lineRoutesPath', 'bgColor', 'fgColor'];

export const savedStopKey = ({ serviceId, stopId }) => `${serviceId}:${stopId}`;

export function isStopSaved(list, serviceId, stopId) {
  const key = savedStopKey({ serviceId, stopId });
  return list.some(entry => savedStopKey(entry) === key);
}

export function toSavedStop(line, details, stop) {
  const summary = {};
  for (const field of LINE_FIELDS) {
    if (line[field] !== undefined) summary[field] = line[field];
  }
  return {
    serviceId: details.serviceId,
    stopId: stop.stopId,
    stopName: stop.name,
    stopIndex: stop.index,
    line: summary
  };
}

export function toggleSavedStop(list, entry) {
  const key = savedStopKey(entry);
  if (list.some(e => savedStopKey(e) === key)) {
    return list.filter(e => savedStopKey(e) !== key);
  }
  return [entry, ...list].slice(0, MAX_SAVED_STOPS);
}

export function formatEta(seconds) {
  if (seconds <= 60) return 'Agora';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

export function upcomingArrivals(predictions, limit = 3) {
  return (predictions?.vehicles || [])
    .filter(v => v.secondsUntilArrival >= 0)
    .sort((a, b) => a.secondsUntilArrival - b.secondsUntilArrival)
    .slice(0, limit)
    .map(v => ({
      vehicleId: v.vehicleId,
      seconds: v.secondsUntilArrival,
      label: formatEta(v.secondsUntilArrival),
      isRealTime: Boolean(v.isRealTime)
    }));
}
