// Transforma a resposta de /api/reliability em texto + tom semântico (success | warn | danger)
const TONES = { on_time: 'success', early: 'warn', late: 'danger' };

export function reliabilityBadge(data, { short = false } = {}) {
  const tone = data && TONES[data.level];
  if (!tone) return null;
  const min = Math.abs(data.medianDriftMin ?? 0);

  if (data.level === 'late') return { text: short ? `Atrasa ~${min} min` : `Costuma atrasar ${min} min`, tone };
  if (data.level === 'early') return { text: short ? `Adianta ~${min} min` : `Costuma adiantar ${min} min`, tone };
  return { text: short ? 'Pontual' : 'Costuma chegar no horário', tone };
}
