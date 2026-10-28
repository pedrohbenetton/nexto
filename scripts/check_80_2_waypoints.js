const { getLineDetails } = require('../server/cittamobiService');
const fs = require('fs');

async function test() {
  const path = 'transporte_publico-Sorocaba-CitySorocaba-80-2-Cond.AnaMaria-Centro-0789139e0c00';
  const det = await getLineDetails(path);
  console.log('Path:', path);
  
  // Let's inspect matched landmarks
  const { resolveRouteWaypoints } = require('../server/stopGeocoder');
  // Read stopGeocoder.js source to see function
  const content = fs.readFileSync('server/stopGeocoder.js', 'utf-8');
  // Let's call getRoadRouteGeometry
  const geocoder = require('../server/stopGeocoder');
  const poly = await geocoder.getRoadRouteGeometry(path, 35, det.stops);
  console.log('Polyline points:', poly.length);
  console.log('First 5:', poly.slice(0, 5));
  console.log('Last 5:', poly.slice(-5));
}

test().catch(console.error);
