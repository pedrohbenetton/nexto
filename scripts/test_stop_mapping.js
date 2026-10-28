const axios = require('axios');
const path = require('path');
const citta = require(path.join(__dirname, '..', 'server', 'cittamobiService'));

async function testStopMapping() {
  const cDetails = await citta.getLineDetails('transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604');
  console.log('Total Centro stops:', cDetails.stops.length);

  // Load the cPoly we got
  const centroWps = [
    [-23.582868, -47.524073], // UFSCar
    [-23.555000, -47.485800], // SP-264 Northbound
    [-23.525000, -47.491200], // Pannunzio Northbound
    [-23.508000, -47.484500], // Gen. Carneiro Northbound
    [-23.504718, -47.464810], // Moreira César
    [-23.501500, -47.459000], // JK
    [-23.505427, -47.452724]  // TSP
  ];
  const coordsStr = centroWps.map(([lat, lng]) => lng + ',' + lat).join(';');
  const url = 'https://router.project-osrm.org/route/v1/driving/' + coordsStr + '?overview=full&geometries=geojson&continue_straight=true';
  const res = await axios.get(url, { headers: { 'User-Agent': 'CittaZero/1.0' } });
  const cPoly = res.data.routes[0].geometry.coordinates.map(([lng, lat]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]);

  // Monotonic stop mapping along polyline
  const totalStops = cDetails.stops.length;
  const mappedStops = cDetails.stops.map((s, idx) => {
    // Proportional progress along polyline
    const frac = idx / Math.max(1, totalStops - 1);
    const ptIdx = Math.min(cPoly.length - 1, Math.floor(frac * (cPoly.length - 1)));
    return {
      index: idx,
      name: s.name,
      coords: cPoly[ptIdx]
    };
  });

  const p23 = mappedStops[22];
  console.log('Mapped Stop 23:', p23.index + 1, p23.name, p23.coords);
  const p1 = mappedStops[0];
  console.log('Mapped Stop 1:', p1.index + 1, p1.name, p1.coords);
  const p40 = mappedStops[mappedStops.length - 1];
  console.log('Mapped Stop 40:', p40.index + 1, p40.name, p40.coords);

  // Check if any stop has tatiana detour coords
  const tatianaStops = mappedStops.filter(s => s.coords[0] < -23.535 && s.coords[0] > -23.542 && s.coords[1] > -47.484);
  console.log('Tatiana stops:', tatianaStops.length);
}

testStopMapping().catch(console.error);
