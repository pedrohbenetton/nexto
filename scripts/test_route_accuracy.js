const axios = require('axios');
const fs = require('fs');

const UFSCAR_BAIRRO_WAYPOINTS = [
  [-23.505427, -47.452724], // Terminal São Paulo (R. Leopoldo Machado)
  [-23.501500, -47.459000], // Av. Juscelino Kubitscheck
  [-23.504718, -47.464810], // Av. Moreira César
  [-23.503684, -47.470112], // Av. General Carneiro (Início)
  [-23.506513, -47.483076], // Av. General Carneiro (Centro)
  [-23.518000, -47.488000], // Av. General Carneiro / Armando Pannunzio
  [-23.522293, -47.491307], // Av. Dr. Armando Pannunzio
  [-23.527991, -47.491401], // Av. Dr. Armando Pannunzio (Fim)
  [-23.548000, -47.493000], // Rod. João Leme dos Santos (SP-264 Km 104)
  [-23.564848, -47.494614], // Rod. João Leme dos Santos (Km 106)
  [-23.575000, -47.508000], // Rod. João Leme dos Santos (Km 108)
  [-23.582868, -47.524073]  // UFSCar - Campus Sorocaba (Terminal Universitário)
];

async function testRoute() {
  const coordsStr = UFSCAR_BAIRRO_WAYPOINTS.map(([lat, lon]) => `${lon},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

  console.log("Consultando OSRM com waypoints de corredor...");
  const res = await axios.get(url, { headers: { 'User-Agent': 'CittaZero' }, timeout: 10000 });
  const rawCoords = res.data.routes[0].geometry.coordinates;
  const polyline = rawCoords.map(([lng, lat]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]);

  console.log(`✅ Polyline gerada com ${polyline.length} pontos! Distância: ${(res.data.routes[0].distance / 1000).toFixed(2)} km`);

  // Salvar polyline de teste
  fs.writeFileSync('scripts/test_80_polyline.json', JSON.stringify(polyline, null, 2));
  console.log("Salvo scripts/test_80_polyline.json");
}

testRoute();
