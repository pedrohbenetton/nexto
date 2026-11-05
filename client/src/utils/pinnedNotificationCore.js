// Conteúdo da notificação fixa ("ongoing") com a contagem regressiva de um ponto salvo

// Hash determinístico (FNV-1a) -> inteiro positivo de 31 bits, exigido pelo Android
export function pinnedNotificationId({ serviceId, stopId }) {
  let h = 0x811c9dc5;
  for (const ch of `${serviceId}:${stopId}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return (h & 0x7fffffff) || 1;
}

export function buildPinnedNotification(entry, arrivals) {
  const code = entry.line?.routeCode || '—';
  const [next, ...later] = arrivals || [];
  let headline;
  if (!next) headline = 'sem ônibus previsto';
  else if (next.label === 'Agora') headline = 'chegando agora';
  else headline = next.label;

  let body = entry.stopName;
  if (later.length > 0) body += ` · depois ${later.map(a => a.label).join(' · ')}`;

  return {
    id: pinnedNotificationId(entry),
    title: `Linha ${code} · ${headline}`,
    body,
    ongoing: true,
    autoCancel: false
  };
}
