// Atalhos rápidos de lugares salvos no planejador (Casa e Trabalho)

export const PLACE_SLOTS = [
  { id: 'home', label: 'Casa' },
  { id: 'work', label: 'Trabalho' }
];

const VALID_SLOTS = new Set(PLACE_SLOTS.map(s => s.id));
const STORAGE_KEY = 'nexto_saved_places';

function isValidPlace(p) {
  return Boolean(
    p &&
    typeof p === 'object' &&
    typeof p.name === 'string' &&
    p.name.trim().length > 0 &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    !(p.lat === 0 && p.lng === 0)
  );
}

export function canSavePlaceCandidate(place) {
  if (!isValidPlace(place)) return false;
  return place.name.trim().toLowerCase() !== 'minha localização';
}

export function sanitizeSavedPlaces(raw) {
  const out = { home: null, work: null };
  if (!raw || typeof raw !== 'object') return out;
  for (const { id } of PLACE_SLOTS) {
    const candidate = raw[id];
    if (isValidPlace(candidate)) {
      out[id] = {
        name: candidate.name.trim(),
        lat: Number(candidate.lat),
        lng: Number(candidate.lng)
      };
    }
  }
  return out;
}

export function setSavedPlace(places, slot, place) {
  const current = sanitizeSavedPlaces(places);
  if (!VALID_SLOTS.has(slot) || !canSavePlaceCandidate(place)) return current;
  return {
    ...current,
    [slot]: {
      name: place.name.trim(),
      lat: Number(place.lat),
      lng: Number(place.lng)
    }
  };
}

export function clearSavedPlace(places, slot) {
  const current = sanitizeSavedPlaces(places);
  if (!VALID_SLOTS.has(slot)) return current;
  return { ...current, [slot]: null };
}

export function loadSavedPlaces() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitizeSavedPlaces(raw ? JSON.parse(raw) : null);
  } catch {
    return { home: null, work: null };
  }
}

export function storeSavedPlaces(places) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeSavedPlaces(places)));
  } catch {
    // Ignora indisponibilidade de storage
  }
}
