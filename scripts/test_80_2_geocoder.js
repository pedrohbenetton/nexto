const { resolveRouteWaypoints } = require('../server/stopGeocoder');
const { getLineDetails } = require('../server/cittamobiService');

async function test() {
  const path = 'transporte_publico-Sorocaba-CitySorocaba-80-2-Cond.AnaMaria-Centro-0789139e0c00';
  const det = await getLineDetails(path);
  console.log('Path:', path);
  console.log('Stops count:', det.stops.length);
  // Let's see what resolveRouteWaypoints in stopGeocoder does
  const geocoder = require('../server/stopGeocoder');
  const poly = await geocoder.getRoadRouteGeometry(path, 35, det.stops);
  console.log('Polyline length:', poly.length);

  // Check if polyline goes to Tatiana
  const tatiana = poly.filter(p => p[0] <= -23.535 && p[0] >= -23.555 && p[1] <= -47.495 && p[1] >= -47.515);
  console.log('Tatiana points:', tatiana.length);
  if (tatiana.length > 0) {
    console.log('Sample Tatiana pts:', tatiana.slice(0, 5));
  }
}

test().catch(console.error);
