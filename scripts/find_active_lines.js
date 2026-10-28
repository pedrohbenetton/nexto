const axios = require('axios');
const path = require('path');
const citta = require(path.join(__dirname, '..', 'server', 'cittamobiService'));

async function main() {
  const lines = await citta.getLinesByCityId(35);
  console.log(`Found ${lines.length} lines in Sorocaba.`);

  let foundActive = 0;
  for (let i = 0; i < Math.min(25, lines.length); i++) {
    const line = lines[i];
    try {
      const details = await citta.getLineDetails(line.lineRoutesPath);
      if (details.serviceId && details.stops && details.stops.length > 0) {
        const testStop = details.stops[0];
        const pred = await citta.getStopPredictions(details.serviceId, testStop.stopId);
        const realVehicles = (pred.vehicles || []).filter(v => v.isRealTime);
        if (realVehicles.length > 0 || pred.activeVehicles > 0) {
          foundActive++;
          console.log(`\n🎯 Active Line: ${line.routeCode} - ${line.routeMnemonic} (${line.serviceMnemonic})`);
          console.log(`   activeVehicles: ${pred.activeVehicles}`);
          console.log(`   realTime vehicles:`, realVehicles.map(v => ({ id: v.vehicleId, eta: v.minutesUntilArrival, lat: v.currentLat, lng: v.currentLng })));
        }
      }
    } catch (e) {}
  }
  console.log(`\nLines checked: 25, Lines with active GPS buses: ${foundActive}`);
}

main().catch(console.error);
