// Catálogo de cidades populares com os IDs oficiais da API Cittamobi, coordenadas de viés e migração de IDs legados

export const DEFAULT_CITY = {
  cityId: 35,
  cityName: 'Sorocaba',
  stateInitials: 'SP'
};

export const POPULAR_CITIES = [
  { cityId: 35, cityName: 'Sorocaba', stateInitials: 'SP' },
  { cityId: 28, cityName: 'São Paulo', stateInitials: 'SP' },
  { cityId: 8, cityName: 'Salvador', stateInitials: 'BA' },
  { cityId: 16, cityName: 'Belo Horizonte', stateInitials: 'MG' },
  { cityId: 20, cityName: 'Recife', stateInitials: 'PE' },
  { cityId: 10, cityName: 'Brasília', stateInitials: 'DF' },
  { cityId: 5, cityName: 'Maceió', stateInitials: 'AL' }
];

const CITY_COORDS = {
  35: { lat: -23.5054, lng: -47.4527 },
  28: { lat: -23.5505, lng: -46.6333 },
  9001: { lat: -23.5505, lng: -46.6333 },
  8: { lat: -12.9777, lng: -38.5016 },
  16: { lat: -19.9191, lng: -43.9387 },
  20: { lat: -8.0632, lng: -34.8711 },
  10: { lat: -15.7939, lng: -47.8828 },
  5: { lat: -9.6660, lng: -35.7350 },
  9002: { lat: -22.9035, lng: -43.2096 }
};

const LEGACY_ID_FIXES = [
  { cityName: 'São Paulo', wrongId: 1, correctId: 28 },
  { cityName: 'Salvador', wrongId: 10, correctId: 8 },
  { cityName: 'Belo Horizonte', wrongId: 14, correctId: 16 },
  { cityName: 'Recife', wrongId: 18, correctId: 20 },
  { cityName: 'Maceió', wrongId: 22, correctId: 5 }
];

export function cleanCitySearchName(cityName) {
  if (!cityName) return '';
  return String(cityName).replace(/\s*\([^)]*\)\s*/g, '').trim();
}

export function getCityCoords(city) {
  if (!city || typeof city !== 'object') return null;
  const coords = CITY_COORDS[Number(city.cityId)];
  return coords ? { ...coords } : null;
}

export function normalizeSavedCity(raw) {
  if (!raw || typeof raw !== 'object' || !raw.cityId || !raw.cityName) {
    return DEFAULT_CITY;
  }
  const numId = Number(raw.cityId);
  const nameLower = String(raw.cityName).trim().toLowerCase();

  for (const fix of LEGACY_ID_FIXES) {
    if (numId === fix.wrongId && nameLower === fix.cityName.toLowerCase()) {
      return { ...raw, cityId: fix.correctId };
    }
  }
  return raw;
}
