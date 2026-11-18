import { putCachedLineDetails } from './offlineCatalogCore';

const LINES_PREFIX = 'nexto_lines_city_';
const DETAILS_KEY = 'nexto_line_details_v1';

export function saveCityLines(cityId, lines) {
  if (!cityId || !Array.isArray(lines) || lines.length === 0) return;
  try {
    localStorage.setItem(`${LINES_PREFIX}${cityId}`, JSON.stringify({ at: Date.now(), lines }));
  } catch {
    // Quota ou storage indisponível
  }
}

export function loadCityLines(cityId) {
  if (!cityId) return null;
  try {
    const raw = localStorage.getItem(`${LINES_PREFIX}${cityId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.lines) && parsed.lines.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function loadAllLineDetails() {
  try {
    const raw = localStorage.getItem(DETAILS_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
}

export function loadLineDetails(lineRoutesPath) {
  if (!lineRoutesPath) return null;
  const store = loadAllLineDetails();
  return store[lineRoutesPath]?.details || null;
}

export function saveLineDetails(lineRoutesPath, details) {
  if (!lineRoutesPath || !details) return loadAllLineDetails();
  const next = putCachedLineDetails(loadAllLineDetails(), lineRoutesPath, details);
  try {
    localStorage.setItem(DETAILS_KEY, JSON.stringify(next));
  } catch {
    // Quota cheia: mantém retorno em memória
  }
  return next;
}
