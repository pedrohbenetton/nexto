const axios = require('axios');

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
  const coordsStr = UFSCAR_BAIRRO_WPS.map(([lat, lng]) => lng + ',' + lat).join(';');
  const url = 'https://router.project-osrm.org/route/v1/driving/' + coordsStr + '?overview=full&steps=true';
  const res = await axios.get(url);
  console.log('Total distance:', (res.data.routes[0].distance / 1000).toFixed(2), 'km');
  res.data.routes[0].legs.forEach((leg, lIdx) => {
    leg.steps.forEach(s => {
      const isUturn = s.maneuver.type.includes('uturn') || (s.maneuver.modifier && s.maneuver.modifier.includes('uturn'));
      if (isUturn) {
        console.log('U-turn in Leg ' + lIdx + ': ' + (s.name || s.ref) + ' (' + Math.round(s.distance) + 'm)');
      }
    });
  });
}

main().catch(console.error);
