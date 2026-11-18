const fs = require('fs');
const path = require('path');

// Histórico de previsões de chegada (7 dias), com persistência em disco para sobreviver a reinícios do BFF.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SAMPLES_PER_KEY = 200;
const MIN_LEAD_SEC = 300; // só vale como amostra se previsto com ≥ 5 min de antecedência
const ARRIVED_WITHIN_SEC = 120; // sumiu a ≤ 2 min da parada = chegou
const GONE_AFTER_MS = 60 * 1000; // ausente por ≥ 1 min = saiu da lista
const MIN_SAMPLES = 3;
const ON_TIME_MIN = 2;
const DEFAULT_FILE = path.join(__dirname, 'data', 'prediction_history.json');

function writeJsonAtomic(filePath, payload) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const serialized = JSON.stringify(payload, null, 2);
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tmpPath, serialized, 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch {
    fs.writeFileSync(filePath, serialized, 'utf8');
  }
}

class PredictionHistory {
  constructor({ filePath = null, debounceMs = 2000 } = {}) {
    this.tracks = new Map(); // key -> Map(vehicleId -> { firstSeen, firstEta, lastSeen, lastEta })
    this.samples = new Map(); // key -> [{ at, hour, driftSec }]
    this.ghosts = new Map(); // key -> [at]
    this.filePath = filePath;
    this.debounceMs = debounceMs;
    this._saveTimer = null;
    this._dirty = false;

    if (this.filePath) {
      this._loadFromDisk();
    }
  }

  static key(serviceId, stopId) {
    return `${serviceId}:${stopId}`;
  }

  _loadFromDisk() {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      const now = Date.now();

      if (raw?.samples && typeof raw.samples === 'object') {
        for (const [k, arr] of Object.entries(raw.samples)) {
          if (!Array.isArray(arr)) continue;
          const valid = arr
            .filter(s => s && Number.isFinite(s.at) && Number.isFinite(s.driftSec) && now - s.at < RETENTION_MS)
            .slice(-MAX_SAMPLES_PER_KEY);
          if (valid.length > 0) this.samples.set(k, valid);
        }
      }

      if (raw?.ghosts && typeof raw.ghosts === 'object') {
        for (const [k, arr] of Object.entries(raw.ghosts)) {
          if (!Array.isArray(arr)) continue;
          const valid = arr
            .filter(at => Number.isFinite(at) && now - at < RETENTION_MS)
            .slice(-MAX_SAMPLES_PER_KEY);
          if (valid.length > 0) this.ghosts.set(k, valid);
        }
      }
    } catch {
      // Arquivo ausente ou corrompido: inicia limpo em memória
    }
  }

  _scheduleSave() {
    if (!this.filePath) return;
    this._dirty = true;
    if (this.debounceMs <= 0) {
      this.flush();
      return;
    }
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.flush();
    }, this.debounceMs);
    if (typeof this._saveTimer.unref === 'function') this._saveTimer.unref();
  }

  flush() {
    if (!this.filePath || !this._dirty) return;
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    this._dirty = false;
    const now = Date.now();
    const samplesObj = {};
    for (const [k, arr] of this.samples.entries()) {
      const valid = arr.filter(s => now - s.at < RETENTION_MS).slice(-MAX_SAMPLES_PER_KEY);
      if (valid.length > 0) samplesObj[k] = valid;
    }
    const ghostsObj = {};
    for (const [k, arr] of this.ghosts.entries()) {
      const valid = arr.filter(at => now - at < RETENTION_MS).slice(-MAX_SAMPLES_PER_KEY);
      if (valid.length > 0) ghostsObj[k] = valid;
    }
    try {
      writeJsonAtomic(this.filePath, { updatedAt: now, samples: samplesObj, ghosts: ghostsObj });
    } catch {
      // Falha de escrita não interrompe o serviço em memória
    }
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

    let mutated = false;
    for (const [id, t] of tracks) {
      if (seen.has(id) || now - t.lastSeen < GONE_AFTER_MS) continue;
      tracks.delete(id);
      if (t.lastEta <= ARRIVED_WITHIN_SEC) {
        if (this._finish(key, t)) mutated = true;
      } else {
        this._push(this.ghosts, key, now);
        mutated = true;
      }
    }

    if (tracks.size) this.tracks.set(key, tracks);
    else this.tracks.delete(key);

    if (mutated) this._scheduleSave();
  }

  _finish(key, t) {
    if (t.firstEta < MIN_LEAD_SEC) return false;
    const arrival = t.lastSeen + t.lastEta * 1000;
    const predicted = t.firstSeen + t.firstEta * 1000;
    this._push(this.samples, key, { at: arrival, hour: new Date(arrival).getHours(), driftSec: (arrival - predicted) / 1000 });
    return true;
  }

  _push(map, key, item) {
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

const singleton = new PredictionHistory({
  filePath: process.env.NODE_TEST_CONTEXT ? null : DEFAULT_FILE
});

process.once('beforeExit', () => singleton.flush());

module.exports = singleton;
module.exports.PredictionHistory = PredictionHistory;
