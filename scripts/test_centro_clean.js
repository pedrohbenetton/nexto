const { getLineTracking } = require('../server/cittamobiService');

async function testCentro() {
  console.log('Testing Centro direction...');
  const centroPath = 'transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604';
  const track = await getLineTracking(centroPath);

  console.log(`Polyline points: ${track.polyline.length}`);
  console.log(`Stops count: ${track.stops.length}`);
  console.log(`Vehicles count (isRealTime only): ${track.vehiclesCount}`);
  track.vehicles.forEach(v => {
    console.log(`  [BUS #${v.vehicleId}] Coord: (${v.lat}, ${v.lng}) | isRealTime: ${v.isRealTime} | ETA: ${v.secondsUntilArrival}s | Next: ${v.nextStopName}`);
  });

  const tatiana = track.polyline.filter(p => -23.555 <= p[0] && p[0] <= -23.535 && p[1] <= -47.498);
  console.log(`Tatiana points in Centro: ${tatiana.length}`);
}

testCentro().catch(console.error);
