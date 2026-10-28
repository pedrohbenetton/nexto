const axios = require('axios');

async function testOSRM(wps) {
  const coordsStr = wps.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
  const res = await axios.get(url, { headers: { 'User-Agent': 'CittaZero-Test/1.0' } });
  const poly = res.data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  console.log('Poly count:', poly.length, 'distance:', res.data.routes[0].distance);
  // Check if any point deviates into Tatiana/Romilda (lng > -47.485 or lng < -47.495 when lat between -23.535 and -23.55)
  return poly;
}

async function main() {
  // Let's test a straight path from Armando Pannunzio cloverleaf directly down SP-264
  // Cloverleaf overpass of Raposo Tavares on Armando Pannunzio / SP-264:
  // Let's find coordinates of Raposo Tavares overpass:
  // Latitude is roughly -23.5385
  const testWps = [
    [-23.535000, -47.492000], // Armando Pannunzio before Raposo
    [-23.540000, -47.490000], // Just after Raposo on SP-264
    [-23.550000, -47.484500], // SP-264 further south
    [-23.564848, -47.494614], // SP-264 km 106
    [-23.575000, -47.508000], // SP-264 km 108
    [-23.582868, -47.524073]  // UFSCar
  ];

  const poly = await testOSRM(testWps);
  console.log('First 5:', poly.slice(0, 5));
  console.log('Points 20-30:', poly.slice(20, 30));
}

main().catch(console.error);
