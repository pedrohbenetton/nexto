const { findNearbyStops } = require('../server/nearbyStops');

// Teste perto do Shopping Iguatemi ou General Carneiro em Sorocaba
const stops = findNearbyStops(-23.518, -47.470, 3000, 5);
console.log(`Encontradas ${stops.length} paradas próximas:`);
stops.forEach((s, i) => {
  console.log(`[${i+1}] ${s.name} - ${s.distanceMeters}m (${s.walkTimeMinutes} min a pé) @ (${s.lat}, ${s.lng})`);
});
