const fs = require('fs');
const path = require('path');

const STOP_CACHE_FILE = path.join(__dirname, 'data', 'stop_coords_cache.json');

// Cálculo da distância em metros via fórmula de Haversine
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Retorna as paradas mais próximas de um par de coordenadas (lat, lng)
function findNearbyStops(userLat, userLng, maxRadiusMeters = 2000, limit = 10) {
  if (!fs.existsSync(STOP_CACHE_FILE)) return [];

  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(STOP_CACHE_FILE, 'utf8'));
  } catch (e) {
    return [];
  }

  const results = [];
  for (const [key, val] of Object.entries(raw)) {
    if (!val || typeof val.lat !== 'number' || typeof val.lng !== 'number') continue;
    
    // Extrai o nome legível da parada removendo prefixo da cidade
    const parts = key.split(':');
    const cityId = parts[0];
    const rawAddress = parts.slice(1).join(':');
    const cleanName = rawAddress.split(',')[0].trim().toUpperCase();

    const distanceMeters = haversineDistance(userLat, userLng, val.lat, val.lng);

    if (distanceMeters <= maxRadiusMeters) {
      const walkTimeMinutes = Math.max(1, Math.round(distanceMeters / 80)); // ~80m por minuto de caminhada
      results.push({
        cityId: parseInt(cityId),
        address: rawAddress,
        name: cleanName || "PARADA DE EMBARQUE",
        lat: val.lat,
        lng: val.lng,
        distanceMeters,
        walkTimeMinutes
      });
    }
  }

  // Ordena por distância crescente
  results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return results.slice(0, limit);
}

module.exports = {
  haversineDistance,
  findNearbyStops
};
