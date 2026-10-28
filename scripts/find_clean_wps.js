const axios = require('axios');

async function testWp(wpPannunzio) {
  const centro = [
    [-23.582868, -47.524073],
    wpPannunzio,
    [-23.504500, -47.472000],
    [-23.505427, -47.452724]
  ];
  const coordsStr = centro.map(([lat, lng]) => lng + ',' + lat).join(';');
  const url = 'https://router.project-osrm.org/route/v1/driving/' + coordsStr + '?overview=full&steps=true';
  const res = await axios.get(url);
  const route = res.data.routes[0];
  const uturns = [];
  route.legs.forEach((leg, lIdx) => {
    leg.steps.forEach(s => {
      if (s.maneuver.type.includes('uturn') || (s.maneuver.modifier && s.maneuver.modifier.includes('uturn'))) {
        uturns.push(`${s.name || s.ref} in leg ${lIdx}`);
      }
    });
  });
  return { dist: (route.distance / 1000).toFixed(2), uturns };
}

async function main() {
  const candidates = [
    [-23.535000, -47.491600],
    [-23.535000, -47.491400],
    [-23.535000, -47.491200],
    [-23.525000, -47.491200],
    [-23.525000, -47.491400],
    [-23.518000, -47.487600], // Praça Oxford junction
    [-23.515000, -47.486000]  // General Carneiro / Pannunzio junction
  ];

  for (const c of candidates) {
    const res = await testWp(c);
    console.log(`Coord ${c}: dist=${res.dist}km, uturns=${res.uturns.length} (${res.uturns.join(', ')})`);
  }
}

main().catch(console.error);
