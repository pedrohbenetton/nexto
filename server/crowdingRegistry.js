const fs = require('fs');
const path = require('path');

const MIN = 60 * 1000;
const CROWDING_TTL_MS = 35 * MIN;
const DEFAULT_FILE = path.join(__dirname, 'data', 'crowding_state.json');

// Tipos de relato: ttl em ms e rótulo. Relatos de ônibus valem 35 min; de ponto, 3 h.
const ISSUE_TYPES = {
  no_ac: { label: 'AR-CONDICIONADO NÃO FUNCIONA', ttl: 35 * MIN },
  broken: { label: 'ÔNIBUS COM DEFEITO', ttl: 35 * MIN },
  unsafe_night: { label: 'PONTO INSEGURO À NOITE', ttl: 180 * MIN }
};

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

// Registro Colaborativo de Lotação e Problemas, com persistência em disco
class CrowdingRegistry {
  constructor({ filePath = null, debounceMs = 1500 } = {}) {
    this.reports = new Map(); // vehicleId -> { reports: [{ level, timestamp }] }
    this.issues = new Map(); // subjectId -> [{ type, timestamp }]
    this.filePath = filePath;
    this.debounceMs = debounceMs;
    this._saveTimer = null;
    this._dirty = false;

    if (this.filePath) {
      this._loadFromDisk();
    }
  }

  _loadFromDisk() {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      const now = Date.now();

      if (raw?.reports && typeof raw.reports === 'object') {
        for (const [vehicleId, list] of Object.entries(raw.reports)) {
          if (!Array.isArray(list)) continue;
          const valid = list.filter(
            r => r && ['low', 'medium', 'high'].includes(r.level) && Number.isFinite(r.timestamp) && now - r.timestamp < CROWDING_TTL_MS
          );
          if (valid.length > 0) this.reports.set(vehicleId, { reports: valid });
        }
      }

      if (raw?.issues && typeof raw.issues === 'object') {
        for (const [subjectId, list] of Object.entries(raw.issues)) {
          if (!Array.isArray(list)) continue;
          const valid = list.filter(
            r => r && ISSUE_TYPES[r.type] && Number.isFinite(r.timestamp) && now - r.timestamp < ISSUE_TYPES[r.type].ttl
          );
          if (valid.length > 0) this.issues.set(subjectId, valid);
        }
      }
    } catch {
      // Arquivo corrompido ou ilegível: inicia limpo em memória
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

    const reportsObj = {};
    for (const [vehicleId, entry] of this.reports.entries()) {
      const valid = (entry?.reports || []).filter(r => now - r.timestamp < CROWDING_TTL_MS);
      if (valid.length > 0) reportsObj[vehicleId] = valid;
    }

    const issuesObj = {};
    for (const [subjectId, list] of this.issues.entries()) {
      const valid = (list || []).filter(r => ISSUE_TYPES[r.type] && now - r.timestamp < ISSUE_TYPES[r.type].ttl);
      if (valid.length > 0) issuesObj[subjectId] = valid;
    }

    try {
      writeJsonAtomic(this.filePath, { updatedAt: now, reports: reportsObj, issues: issuesObj });
    } catch {
      // Ignora erro de I/O
    }
  }

  // Registrar relato de problema (veículo ou ponto). Retorna false se o tipo for inválido.
  addIssue(subjectId, type) {
    if (!subjectId || !ISSUE_TYPES[type]) return false;
    const now = Date.now();
    const key = String(subjectId);
    const list = (this.issues.get(key) || []).filter(r => now - r.timestamp < ISSUE_TYPES[r.type].ttl);
    list.push({ type, timestamp: now });
    this.issues.set(key, list);
    this._scheduleSave();
    return true;
  }

  // Relatos válidos agregados por tipo: [{ type, label, count, lastReportAt }]
  getIssues(subjectId) {
    const now = Date.now();
    const valid = (this.issues.get(String(subjectId)) || [])
      .filter(r => now - r.timestamp < ISSUE_TYPES[r.type].ttl);
    return Object.keys(ISSUE_TYPES).flatMap(type => {
      const hits = valid.filter(r => r.type === type);
      if (!hits.length) return [];
      return [{
        type,
        label: ISSUE_TYPES[type].label,
        count: hits.length,
        lastReportAt: new Date(hits[hits.length - 1].timestamp).toISOString()
      }];
    });
  }

  // Registrar reporte do usuário (level: 'low' | 'medium' | 'high')
  addReport(vehicleId, level) {
    if (!vehicleId || !['low', 'medium', 'high'].includes(level)) return;

    const now = Date.now();
    const entry = this.reports.get(vehicleId) || { reports: [] };

    // Limpar reportes com mais de 35 minutos
    const validReports = entry.reports.filter(r => now - r.timestamp < CROWDING_TTL_MS);
    validReports.push({ level, timestamp: now });

    this.reports.set(vehicleId, { reports: validReports });
    this._scheduleSave();
  }

  // Obter nível consolidado de vários veículos de uma vez ({ [vehicleId]: status })
  getBatchCrowding(vehicleIds = []) {
    const result = {};
    for (const rawId of vehicleIds) {
      const id = String(rawId || '').trim();
      if (!id) continue;
      result[id] = this.getCrowding(id);
    }
    return result;
  }

  // Obter nível consolidado
  getCrowding(vehicleId) {
    const entry = this.reports.get(vehicleId);
    if (!entry || entry.reports.length === 0) {
      return {
        level: 'unknown',
        label: 'SEM DADOS DE LOTAÇÃO',
        votesCount: 0,
        lastReportAt: null
      };
    }

    const now = Date.now();
    const valid = entry.reports.filter(r => now - r.timestamp < CROWDING_TTL_MS);
    if (valid.length === 0) {
      return {
        level: 'unknown',
        label: 'SEM DADOS RECENTES',
        votesCount: 0,
        lastReportAt: null
      };
    }

    // Calcular nível com mais votos
    const counts = { low: 0, medium: 0, high: 0 };
    valid.forEach(r => counts[r.level]++);

    let dominant = 'low';
    if (counts.medium >= counts.low && counts.medium >= counts.high) dominant = 'medium';
    if (counts.high > counts.medium && counts.high >= counts.low) dominant = 'high';

    const labels = {
      low: 'ASSENTOS DISPONÍVEIS',
      medium: 'MODERADO / EM PÉ',
      high: 'LOTADO / CAPACIDADE MÁXIMA'
    };

    return {
      level: dominant,
      label: labels[dominant],
      votesCount: valid.length,
      lastReportAt: new Date(valid[valid.length - 1].timestamp).toISOString()
    };
  }
}

const singleton = new CrowdingRegistry({
  filePath: process.env.NODE_TEST_CONTEXT ? null : DEFAULT_FILE
});

process.once('beforeExit', () => singleton.flush());

module.exports = singleton;
module.exports.CrowdingRegistry = CrowdingRegistry;
