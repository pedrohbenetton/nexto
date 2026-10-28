const { getLineDetails, getStopPredictions } = require('../server/cittamobiService');

async function test() {
  const linePath = 'transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7';
  const details = await getLineDetails(linePath);
  console.log('ServiceId:', details.serviceId);
  console.log('Stops count:', details.stops.length);

  for (let i = 0; i < details.stops.length; i += 5) {
    const s = details.stops[i];
    const pred = await getStopPredictions(details.serviceId, s.stopId);
    if (pred && pred.vehicles && pred.vehicles.length > 0) {
      console.log(`\nStop #${i+1} (${s.name}): found ${pred.vehicles.length} vehicles!`);
      pred.vehicles.forEach(v => {
        console.log(`   Vehicle: ${v.vehicleId} | isRealTime: ${v.isRealTime} | lat: ${v.currentLat} | lng: ${v.currentLng} | seconds: ${v.secondsUntilArrival}`);
      });
    }
  }
}

test().catch(console.error);
