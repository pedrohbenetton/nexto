const axios = require('axios');
const fs = require('fs');

function removeSpikesAndLoops(polyline) {
  if (!polyline || polyline.length < 3) return polyline || [];

  const cleaned = [];
  let i = 0;
  const n = polyline.length;

  while (i < n) {
    const pt = polyline[i];
    let foundLoop = false;

    // Look ahead up to 80 points to detect self-reversal spikes/loops
    const maxLookahead = Math.min(n - 1, i + 80);
    for (let j = maxLookahead; j >= i + 4; j--) {
      const target = polyline[j];
      const d = Math.hypot(pt[0] - target[0], pt[1] - target[1]);
      if (d < 0.0004) {
        // Point j returns to within 40m of point i -> loop/U-turn detected
        cleaned.push(pt);
        i = j; // skip loop
        foundLoop = true;
        break;
      }
    }

    if (!foundLoop) {
      cleaned.push(pt);
      i++;
    }
  }

  return cleaned;
}

const UFSCAR_BAIRRO_WAYPOINTS = [
  [-23.505427, -47.452724], // TSP / Leopoldo Machado
  [-23.501500, -47.459000], // Av. Pres. Juscelino Kubitscheck
  [-23.504718, -47.464810], // Moreira César
  [-23.503684, -47.470112], // General Carneiro 140
  [-23.506513, -47.483076], // General Carneiro 972
  [-23.518000, -47.488000], // General Carneiro / Pannunzio junction
  [-23.522293, -47.491307], // Armando Pannunzio 316
  [-23.527991, -47.491401], // Armando Pannunzio 765
  [-23.535000, -47.492000], // Armando Pannunzio 1700
  [-23.548000, -47.493000], // SP-264 km 104
  [-23.564848, -47.494614], // SP-264 km 106
  [-23.575000, -47.508000], // SP-264 km 108
  [-23.582868, -47.524073]  // UFSCar Campus
];

async function testOSRMClean() {
  console.log('Testing OSRM with loop removal...');
  const coordsStr = UFSCAR_BAIRRO_WAYPOINTS.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
  const res = await axios.get(url, { headers: { 'User-Agent': 'CittaZeroRouteEngine/3.0' } });
  const raw = res.data.routes[0].geometry.coordinates.map(([lng, lat]) => [
    Number(lat.toFixed(6)),
    Number(lng.toFixed(6))
  ]);

  console.log(`Raw OSRM points: ${raw.length}`);
  const clean = removeSpikesAndLoops(raw);
  console.log(`Cleaned points: ${clean.length} (removed ${raw.length - clean.length} loop points)`);

  // Check Tatiana in clean points
  const tatiana = clean.filter(p => -23.555 <= p[0] && p[0] <= -23.535 && p[1] <= -47.498);
  console.log(`Tatiana points in cleaned route: ${tatiana.length}`);

  // Check start and end
  console.log('Start point (TSP):', clean[0]);
  console.log('End point (UFSCar):', clean[clean.length - 1]);

  console.log('\nTesting OSRM Centro with loop removal...');
  const coordsStrC = [...UFSCAR_BAIRRO_WAYPOINTS].reverse().map(([lat, lng]) => `${lng},${lat}`).join(';');
  const urlC = `https://router.project-osrm.org/route/v1/driving/${coordsStrC}?overview=full&geometries=geojson`;
  const resC = await axios.get(urlC, { headers: { 'User-Agent': 'CittaZeroRouteEngine/3.0' } });
  const rawC = resC.data.routes[0].geometry.coordinates.map(([lng, lat]) => [
    Number(lat.toFixed(6)),
    Number(lng.toFixed(6))
  ]);

  console.log(`Raw OSRM Centro points: ${rawC.length}`);
  const cleanC = removeSpikesAndLoops(rawC);
  console.log(`Cleaned Centro points: ${cleanC.length} (removed ${rawC.length - cleanC.length} loop points)`);

  const tatianaC = cleanC.filter(p => -23.555 <= p[0] && p[0] <= -23.535 && p[1] <= -47.498);
  console.log(`Tatiana points in cleaned Centro: ${tatianaC.length}`);
  console.log('Start point (UFSCar):', cleanC[0]);
  console.log('End point (TSP):', cleanC[cleanC.length - 1]);
}

testOSRMClean().catch(console.error);
