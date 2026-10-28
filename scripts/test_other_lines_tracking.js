const { getLineTracking } = require('../server/cittamobiService');

async function testOtherLines() {
  const testPaths = [
    'transporte_publico-Sorocaba-ConsorcioSorocaba-20-06-Carol-TERMINALSANTOANTONIO-8974c2ea609b',
    'transporte_publico-Sorocaba-ConsorcioSorocaba-56-Iguatemi-Bairro-f2d66566830d',
    'transporte_publico-Sorocaba-BRTSorocaba-E180-Caranda-be8440513188'
  ];

  for (const p of testPaths) {
    try {
      console.log(`\nTesting: ${p.slice(0, 45)}...`);
      const t = await getLineTracking(p);
      console.log(`  Stops: ${t.stopsCount} | Polyline pts: ${t.polyline.length} | Live buses: ${t.vehiclesCount}`);
      t.vehicles.forEach(v => {
        console.log(`    [BUS #${v.vehicleId}] (${v.lat}, ${v.lng}) isRealTime=${v.isRealTime}`);
      });
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }
}

testOtherLines().catch(console.error);
