const { getLineDetails, getLineTracking } = require('../server/cittamobiService');

async function test() {
  console.log('Testing refactored tracking for Line 80...');
  const bairroPath = 'transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7';
  const track = await getLineTracking(bairroPath);

  console.log(`Polyline points: ${track.polyline.length}`);
  console.log(`Stops count: ${track.stops.length}`);
  console.log(`Vehicles count (isRealTime only): ${track.vehiclesCount}`);
  track.vehicles.forEach(v => {
    console.log(`  [BUS #${v.vehicleId}] Coord: (${v.lat}, ${v.lng}) | isRealTime: ${v.isRealTime} | ETA: ${v.secondsUntilArrival}s | Next: ${v.nextStopName}`);
  });

  // Verify that all vehicles have isRealTime: true
  const nonRealTime = track.vehicles.filter(v => !v.isRealTime);
  if (nonRealTime.length > 0) {
    console.error('FAILED: non-realtime vehicles found!');
  } else {
    console.log('✅ ALL displayed vehicles have active realtime telemetry!');
  }
}

test().catch(console.error);
