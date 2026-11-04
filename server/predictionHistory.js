// Histórico em memória das previsões de chegada, para medir a confiabilidade de uma linha
// numa parada: quanto a chegada real costuma diferir da primeira previsão feita com antecedência.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SAMPLES_PER_KEY = 200;
const MIN_LEAD_SEC = 300; // só vale como amostra se previsto com ≥ 5 min de antecedência
const ARRIVED_WITHIN_SEC = 120; // sumiu a ≤ 2 min da parada = chegou
const GONE_AFTER_MS = 60 * 1000; // ausente por ≥ 1 min = saiu da lista
const MIN_SAMPLES = 3;
const ON_TIME_MIN = 2;

class PredictionHistory {
  constructor() {
    this.tracks = new Map(); // key -> Map(vehicleId -> { firstSeen, firstEta, lastSeen, lastEta })
    this.samples = new Map(); // key -> [{ at, hour, driftSec }]
    this.ghosts = new Map(); // key -> [at]
  }

  static key(serviceId, stopId) {
    return `${serviceId}:${stopId}`;
  }

  // vehicles: lista normalizada de getStopPredictions
  record(serviceId, stopId, vehicles) {
    if (!serviceId || !stopId || !Array.isArray(vehicles)) return;
    const key = PredictionHistory.key(serviceId, stopId);
    const now = Date.now();
    const tracks = this.tracks.get(key) || new Map();
    const seen = new Set();

    for (const v of vehicles) {
      if (!v || !v.vehicleId || !v.isRealTime || !(v.secondsUntilArrival >= 0)) continue;
      seen.add(v.vehicleId);
      const t = tracks.get(v.vehicleId);
      if (t) {
        t.lastSeen = now;
        t.lastEta = v.secondsUntilArrival;
      } else {
        tracks.set(v.vehicleId, {
          firstSeen: now, firstEta: v.secondsUntilArrival,
          lastSeen: now, lastEta: v.secondsUntilArrival,
        });
      }
    }

    for (const [id, t] of tracks) {
      if (seen.has(id) || now - t.lastSeen < GONE_AFTER_MS) continue;
      tracks.delete(id);
      if (t.lastEta <= ARRIVED_WITHIN_SEC) this._finish(key, t);
      else this._push(this.ghosts, key, now, now);
    }

    if (tracks.size) this.tracks.set(key, tracks);
    else this.tracks.delete(key);
  }

  _finish(key, t) {
    if (t.firstEta < MIN_LEAD_SEC) return;
    const arrival = t.lastSeen + t.lastEta * 1000;
    const predicted = t.firstSeen + t.firstEta * 1000;
    this._push(this.samples, key, { at: arrival, hour: new Date(arrival).getHours(), driftSec: (arrival - predicted) / 1000 }, arrival);
  }

  _push(map, key, item, at) {
    const list = (map.get(key) || []).filter(x => Date.now() - (x.at ?? x) < RETENTION_MS);
    list.push(item);
    map.set(key, list.slice(-MAX_SAMPLES_PER_KEY));
  }

  // hour (0-23) opcional restringe às chegadas naquele horário do dia
  getReliability(serviceId, stopId, hour) {
    const key = PredictionHistory.key(serviceId, stopId);
    const now = Date.now();
    let list = (this.samples.get(key) || []).filter(s => now - s.at < RETENTION_MS);
    if (Number.isInteger(hour)) list = list.filter(s => s.hour === hour);
    const ghosts = (this.ghosts.get(key) || []).filter(at => now - at < RETENTION_MS).length;

    if (list.length < MIN_SAMPLES) {
      return { level: 'unknown', label: 'SEM HISTÓRICO SUFICIENTE', samples: list.length, medianDriftMin: null, ghosts };
    }
    const sorted = list.map(s => s.driftSec).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianSec = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const medianDriftMin = Math.round(medianSec / 60);
    const abs = Math.abs(medianDriftMin);

    let level = 'on_time';
    let label = 'COSTUMA CHEGAR NO HORÁRIO';
    if (Math.abs(medianSec) / 60 >= ON_TIME_MIN) {
      level = medianSec > 0 ? 'late' : 'early';
      label = `COSTUMA ${level === 'late' ? 'ATRASAR' : 'ADIANTAR'} ${abs} MIN`;
    }
    return { level, label, samples: list.length, medianDriftMin, ghosts };
  }
}

module.exports = new PredictionHistory();
module.exports.PredictionHistory = PredictionHistory;
