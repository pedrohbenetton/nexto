// Registro em Memória de Lotação Colaborativa de Frota (Crowdsourcing)
class CrowdingRegistry {
  constructor() {
    this.reports = new Map(); // vehicleId -> { reports: [{ level, timestamp }] }
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
