import { formatEta } from './savedStops.js';

// Retrato local das últimas previsões de cada ponto salvo, para consulta sem internet.
// A API do Cittamobi não tem horário programado: o que dá para guardar é a última previsão.
export const SNAPSHOT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
export const SNAPSHOT_STORAGE_KEY = 'nexto_arrival_snapshots';

export function putSnapshot(snapshots, key, arrivals, at = Date.now()) {
  if (!arrivals || arrivals.length === 0) return snapshots;
  return { ...snapshots, [key]: { at, arrivals } };
}

// Projeta o retrato para "agora": desconta o tempo decorrido e remove quem já passou
export function projectSnapshot(snapshot, now = Date.now()) {
  if (!snapshot) return null;
  const age = now - snapshot.at;
  if (age < 0 || age > SNAPSHOT_MAX_AGE_MS) return null;
  const elapsedSec = Math.floor(age / 1000);
  const arrivals = snapshot.arrivals
    .map(a => ({ ...a, seconds: a.seconds - elapsedSec, isRealTime: false }))
    .filter(a => a.seconds >= 0)
    .map(a => ({ ...a, label: formatEta(a.seconds) }));
  return { at: snapshot.at, arrivals };
}

export function pruneSnapshots(snapshots, keepKeys) {
  const keep = new Set(keepKeys);
  return Object.fromEntries(Object.entries(snapshots).filter(([k]) => keep.has(k)));
}

export function loadSnapshots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SNAPSHOT_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function storeSnapshots(snapshots) {
  try {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
  } catch {
    // armazenamento cheio ou bloqueado: segue sem offline
  }
}
