const axios = require('axios');

async function getOSRM(wps) {
  const coordsStr = wps.map(([lat, lng]) => lng + ',' + lat).join(';');
  const url = 'https://router.project-osrm.org/route/v1/driving/' + coordsStr + '?overview=full&geometries=geojson&continue_straight=true';
  const res = await axios.get(url, { headers: { 'User-Agent': 'CittaZero-Verify/1.0' } });
  return res.data.routes[0].geometry.coordinates.map(([lng, lat]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
}

async function main() {
  const bairroWps = [
    [-23.505427, -47.452724], // TSP
    [-23.501500, -47.459000], // JK
    [-23.504718, -47.464810], // Moreira César
    [-23.503684, -47.470112], // Gen. Carneiro Início
    [-23.506513, -47.483076], // Gen. Carneiro Vila Lucy
    [-23.522293, -47.491307], // Pannunzio 316
    [-23.535000, -47.492000], // Pannunzio 1700
    [-23.555000, -47.486000], // SP-264
    [-23.582868, -47.524073]  // UFSCar
  ];

  const centroWps = [
    [-23.582868, -47.524073], // UFSCar
    [-23.555000, -47.485800], // SP-264 Northbound
    [-23.525000, -47.491200], // Pannunzio Northbound
    [-23.508000, -47.484500], // Gen. Carneiro Northbound
    [-23.504718, -47.464810], // Moreira César
    [-23.501500, -47.459000], // JK
    [-23.505427, -47.452724]  // TSP
  ];

  const bPoly = await getOSRM(bairroWps);
  const cPoly = await getOSRM(centroWps);

  console.log('Bairro points:', bPoly.length, 'Centro points:', cPoly.length);

  // Check Tatiana detours: points with lat between -23.535 and -23.542 and lng > -47.484
  const bTatiana = bPoly.filter(([lat, lng]) => lat < -23.535 && lat > -23.542 && lng > -47.484);
  const cTatiana = cPoly.filter(([lat, lng]) => lat < -23.535 && lat > -23.542 && lng > -47.484);
  console.log('Bairro Tatiana points:', bTatiana.length);
  console.log('Centro Tatiana points:', cTatiana.length);
}

main().catch(console.error);
