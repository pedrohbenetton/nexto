const axios = require('axios');

async function testOSRMRoute(waypoints, name) {
  const coordsStr = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&continue_straight=true`;
  const res = await axios.get(url, { headers: { 'User-Agent': 'CittaZero-Test/2.0' } });
  const poly = res.data.routes[0].geometry.coordinates.map(([lng, lat]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  const distKm = (res.data.routes[0].distance / 1000).toFixed(2);
  console.log(`\n=== ${name} ===`);
  console.log(`Distance: ${distKm} km | Polyline points: ${poly.length}`);

  // Check for any Tatiana points: lat [-23.545, -23.535], lng > -47.485
  const tatiana = poly.filter(([lat, lng]) => lat < -23.535 && lat > -23.545 && lng > -47.486);
  console.log(`Tatiana/neighborhood detour points: ${tatiana.length}`);

  // Check for Spazio Splendido points: lat [-23.550, -23.543], lng < -47.488
  const spazio = poly.filter(([lat, lng]) => lat < -23.543 && lat > -23.550 && lng < -47.489);
  console.log(`Spazio Splendido detour points: ${spazio.length}`);

  return poly;
}

async function main() {
  // 1. Southbound (Bairro: Terminal São Paulo -> UFSCar)
  // Route: Leopoldo Machado -> JK -> Moreira César -> General Carneiro -> Armando Pannunzio -> SP-264 -> UFSCar
  const bairroWps = [
    [-23.505427, -47.452724], // TSP
    [-23.501500, -47.459000], // Av. Pres. Juscelino Kubitscheck
    [-23.504718, -47.464810], // Av. Moreira César
    [-23.503684, -47.470112], // Av. General Carneiro (Início)
    [-23.506513, -47.483076], // Av. General Carneiro (Vila Lucy)
    [-23.518000, -47.488000], // Av. General Carneiro / Praça Oxford
    [-23.522293, -47.491307], // Av. Dr. Armando Pannunzio 316
    [-23.527991, -47.491401], // Av. Dr. Armando Pannunzio 765
    [-23.535000, -47.492000], // Av. Dr. Armando Pannunzio 1700
    [-23.541000, -47.490500], // Rod. João Leme dos Santos (SP-264 right after Raposo)
    [-23.547000, -47.484000], // SP-264 km 104 (southbound carriageway)
    [-23.555000, -47.486000], // SP-264 km 105
    [-23.564848, -47.494614], // SP-264 km 106
    [-23.575000, -47.508000], // SP-264 km 108
    [-23.582868, -47.524073]  // UFSCar Campus Sorocaba
  ];

  await testOSRMRoute(bairroWps, 'LINHA 80 BAIRRO');

  // 2. Northbound (Centro: UFSCar -> Terminal São Paulo)
  // Route: UFSCar -> SP-264 Northbound -> Armando Pannunzio Northbound -> General Carneiro Northbound -> Moreira César -> JK -> TSP
  const centroWps = [
    [-23.582868, -47.524073], // UFSCar Campus Sorocaba
    [-23.575000, -47.508000], // SP-264 km 108
    [-23.564848, -47.494614], // SP-264 km 106
    [-23.555000, -47.485800], // SP-264 km 105
    [-23.547000, -47.483800], // SP-264 km 104 (northbound carriageway)
    [-23.541000, -47.490200], // SP-264 before Raposo overpass
    [-23.535000, -47.491800], // Av. Dr. Armando Pannunzio (Northbound)
    [-23.527991, -47.491200], // Av. Dr. Armando Pannunzio 765
    [-23.522293, -47.491100], // Av. Dr. Armando Pannunzio 316
    [-23.518000, -47.487800], // Av. General Carneiro / Praça Oxford
    [-23.506513, -47.482900], // Av. General Carneiro (Vila Lucy)
    [-23.503684, -47.469900], // Av. General Carneiro (Início)
    [-23.504718, -47.464810], // Av. Moreira César
    [-23.501500, -47.459000], // Av. Pres. Juscelino Kubitscheck
    [-23.505427, -47.452724]  // TSP
  ];

  await testOSRMRoute(centroWps, 'LINHA 80 CENTRO');
}

main().catch(console.error);
