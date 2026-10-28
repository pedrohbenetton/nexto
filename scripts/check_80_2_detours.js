const geocoder = require('../server/stopGeocoder');
const { getLineDetails } = require('../server/cittamobiService');

async function test() {
  const path = 'transporte_publico-Sorocaba-CitySorocaba-80-2-Cond.AnaMaria-Centro-0789139e0c00';
  const det = await getLineDetails(path);
  const poly = await geocoder.getRoadRouteGeometry(path, 35, det.stops);
  
  // Check Tatiana (lat between -23.535 and -23.555, lng <= -47.498)
  const tatiana = poly.filter(p => -23.555 <= p[0] && p[0] <= -23.535 && p[1] <= -47.498);
  console.log('Tatiana points in 80-2:', tatiana.length);
  if (tatiana.length > 0) {
    console.log('Sample Tatiana in 80-2:', tatiana.slice(0, 5));
  }

  // Check Spazio Splendido (lat between -23.542 and -23.552, lng between -47.485 and -47.492)
  const spazio = poly.filter(p => -23.552 <= p[0] && p[0] <= -23.542 && -47.492 <= p[1] && p[1] <= -47.485);
  console.log('Spazio Splendido points in 80-2:', spazio.length);

  // Check Romilda (lat between -23.518 and -23.525, lng between -47.488 and -47.495)
  const romilda = poly.filter(p => -23.525 <= p[0] && p[0] <= -23.518 && -47.495 <= p[1] && p[1] <= -47.488);
  console.log('Romilda points in 80-2:', romilda.length);
}

test().catch(console.error);
