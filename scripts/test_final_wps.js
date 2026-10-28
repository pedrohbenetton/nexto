const axios = require('axios');

async function testRoute(name, wps) {
  const coordsStr = wps.map(([lat, lng]) => lng + ',' + lat).join(';');
  const url = 'https://router.project-osrm.org/route/v1/driving/' + coordsStr + '?overview=full&geometries=geojson&continue_straight=true';
  const res = await axios.get(url, { headers: { 'User-Agent': 'CittaZero-ITS/1.0' } });
  const poly = res.data.routes[0].geometry.coordinates.map(([lng, lat]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  const dist = (res.data.routes[0].distance / 1000).toFixed(2);
  console.log(`\n=== ${name} ===`);
  console.log(`Distance: ${dist} km | Polyline points: ${poly.length}`);

  // Detour checks:
  // Tatiana/Romilda residential loops: lat [-23.542, -23.535], lng > -47.484
  const tatiana = poly.filter(([lat, lng]) => lat < -23.535 && lat > -23.542 && lng > -47.484);
  console.log(`Tatiana residential points: ${tatiana.length}`);

  // Spazio Splendido loops: lat [-23.549, -23.543], lng < -47.488
  const spazio = poly.filter(([lat, lng]) => lat < -23.543 && lat > -23.549 && lng < -47.488);
  console.log(`Spazio Splendido points: ${spazio.length}`);

  return poly;
}

async function main() {
  const UFSCAR_BAIRRO_WPS = [
    [-23.505427, -47.452724], // TSP
    [-23.501500, -47.459000], // Av. Pres. JK
    [-23.504718, -47.464810], // Moreira César
    [-23.503684, -47.470112], // Gen. Carneiro Início
    [-23.506513, -47.483076], // Gen. Carneiro Vila Lucy
    [-23.518000, -47.488000], // Praça Oxford / Pannunzio
    [-23.522293, -47.491307], // Pannunzio 316
    [-23.527991, -47.491401], // Pannunzio 765
    [-23.535000, -47.492000], // Pannunzio 1700
    [-23.582868, -47.524073]  // UFSCar
  ];

  const UFSCAR_CENTRO_WPS = [
    [-23.582868, -47.524073], // UFSCar
    [-23.518000, -47.487600], // Praça Oxford / Pannunzio Northbound
    [-23.504500, -47.472000], // Gen. Carneiro Northbound
    [-23.504718, -47.464810], // Moreira César
    [-23.501500, -47.459000], // Av. Pres. JK
    [-23.505427, -47.452724]  // TSP
  ];

  const bPoly = await testRoute('LINHA 80 BAIRRO (TSP -> UFSCar)', UFSCAR_BAIRRO_WPS);
  const cPoly = await testRoute('LINHA 80 CENTRO (UFSCar -> TSP)', UFSCAR_CENTRO_WPS);

  console.log('Bairro start:', bPoly[0], 'end:', bPoly[bPoly.length - 1]);
  console.log('Centro start:', cPoly[0], 'end:', cPoly[cPoly.length - 1]);
}

main().catch(console.error);
