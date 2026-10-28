const axios = require('axios');

async function test(name, wps) {
  const coordsStr = wps.map(([lat, lng]) => lng + ',' + lat).join(';');
  const url = 'https://router.project-osrm.org/route/v1/driving/' + coordsStr + '?overview=full&steps=true';
  const res = await axios.get(url);
  const route = res.data.routes[0];
  console.log(`\n=== ${name} ===`);
  console.log('Distance:', (route.distance / 1000).toFixed(2), 'km');
  let hasUturn = false;
  route.legs.forEach((leg, lIdx) => {
    leg.steps.forEach(s => {
      if (s.maneuver.type.includes('uturn') || (s.maneuver.modifier && s.maneuver.modifier.includes('uturn'))) {
        hasUturn = true;
        console.log(`⚠️ U-turn in leg ${lIdx}: ${s.name || s.ref} (${Math.round(s.distance)}m)`);
      }
    });
  });
  if (!hasUturn) console.log('✅ ZERO U-turns! 100% clean direct route!');
  return route;
}

async function main() {
  // Bairro (TSP -> UFSCar)
  const bairro = [
    [-23.505427, -47.452724], // TSP Leopoldo Machado
    [-23.503684, -47.470112], // General Carneiro (Início)
    [-23.506513, -47.483076], // General Carneiro (Vila Lucy)
    [-23.522293, -47.491307], // Armando Pannunzio
    [-23.535000, -47.492000], // Armando Pannunzio 1700
    [-23.582868, -47.524073]  // UFSCar
  ];
  await test('BAIRRO', bairro);

  // Centro (UFSCar -> TSP)
  // On General Carneiro Northbound:
  // Around Vila Lucy northbound: lat -23.506300, lng -47.483000
  // Around Início northbound: lat -23.503500, lng -47.470000
  const centro = [
    [-23.582868, -47.524073], // UFSCar
    [-23.535000, -47.491800], // Armando Pannunzio Northbound
    [-23.522293, -47.491100], // Armando Pannunzio Northbound
    [-23.508000, -47.484500], // General Carneiro Northbound before Vila Lucy
    [-23.504500, -47.472000], // General Carneiro Northbound
    [-23.505427, -47.452724]  // TSP Leopoldo Machado
  ];
  await test('CENTRO', centro);
}

main().catch(console.error);
