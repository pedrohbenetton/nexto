const MIN = 60 * 1000;
// Tipos de relato: ttl em ms e rótulo. Relatos de ônibus valem 35 min; de ponto, 3 h.
const ISSUE_TYPES = {
  no_ac: { label: 'AR-CONDICIONADO NÃO FUNCIONA', ttl: 35 * MIN },
  broken: { label: 'ÔNIBUS COM DEFEITO', ttl: 35 * MIN },
  unsafe_night: { label: 'PONTO INSEGURO À NOITE', ttl: 180 * MIN }
};

// Registro em Memória de Lotação Colaborativa de Frota (Crowdsourcing)
class CrowdingRegistry {
  constructor() {
    this.reports = new Map(); // vehicleId -> { reports: [{ level, timestamp }] }
    this.issues = new Map(); // subjectId -> [{ type, timestamp }]
  }

  // Registrar relato de problema (veículo ou ponto). Retorna false se o tipo for inválido.
  addIssue(subjectId, type) {
    if (!subjectId || !ISSUE_TYPES[type]) return false;
    const now = Date.now();
    const key = String(subjectId);
    const list = (this.issues.get(key) || []).filter(r => now - r.timestamp < ISSUE_TYPES[r.type].ttl);
    list.push({ type, timestamp: now });
    this.issues.set(key, list);
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
    const validReports = entry.reports.filter(r => now - r.timestamp < 35 * 60 * 1000);
    validReports.push({ level, timestamp: now });

    this.reports.set(vehicleId, { reports: validReports });
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
    const valid = entry.reports.filter(r => now - r.timestamp < 35 * 60 * 1000);
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

module.exports = new CrowdingRegistry();
