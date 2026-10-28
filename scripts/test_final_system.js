const path = require('path');
const citta = require(path.join(__dirname, '..', 'server', 'cittamobiService'));

async function main() {
  console.log('=== TESTE 1: DETALHES LINHA 80 BAIRRO ===');
  const detailsB = await citta.getLineDetails('transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7');
  console.log(`Paradas Bairro (${detailsB.stops.length}):`);
  console.log(` - Primeira: [${detailsB.stops[0].index}] ${detailsB.stops[0].name}`);
  console.log(` - Meio (15): [${detailsB.stops[14].index}] ${detailsB.stops[14].name}`);
  console.log(` - Última: [${detailsB.stops[detailsB.stops.length - 1].index}] ${detailsB.stops[detailsB.stops.length - 1].name}`);

  console.log('\n=== TESTE 2: DETALHES LINHA 80 CENTRO ===');
  const detailsC = await citta.getLineDetails('transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604');
  console.log(`Paradas Centro (${detailsC.stops.length}):`);
  console.log(` - Primeira: [${detailsC.stops[0].index}] ${detailsC.stops[0].name}`);
  console.log(` - Meio (23): [${detailsC.stops[22].index}] ${detailsC.stops[22].name}`);
  console.log(` - Última: [${detailsC.stops[detailsC.stops.length - 1].index}] ${detailsC.stops[detailsC.stops.length - 1].name}`);

  console.log('\n=== TESTE 3: TRACKING LINHA 80 BAIRRO ===');
  const trackB = await citta.getLineTracking('transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7', detailsB.serviceId, 35);
  console.log(`Polyline pts: ${trackB.polyline.length} | Stops: ${trackB.stops.length} | Ônibus ao vivo: ${trackB.vehicles.length}`);
  trackB.vehicles.forEach(v => console.log(` - Veículo #${v.vehicleId} (${v.isRealTime ? 'GPS AO VIVO' : 'TEÓRICO'}) em [${v.lat}, ${v.lng}] ETA: ${v.minutesUntilArrival}m`));

  console.log('\n=== TESTE 4: TRACKING LINHA 80 CENTRO ===');
  const trackC = await citta.getLineTracking('transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604', detailsC.serviceId, 35);
  console.log(`Polyline pts: ${trackC.polyline.length} | Stops: ${trackC.stops.length} | Ônibus ao vivo: ${trackC.vehicles.length}`);
  trackC.vehicles.forEach(v => console.log(` - Veículo #${v.vehicleId} (${v.isRealTime ? 'GPS AO VIVO' : 'TEÓRICO'}) em [${v.lat}, ${v.lng}] ETA: ${v.minutesUntilArrival}m`));

  // Verificar desvios indesejados (Tatiana/Spazio)
  const tatianaB = trackB.polyline.filter(([lat, lng]) => lat < -23.535 && lat > -23.542 && lng > -47.484);
  const tatianaC = trackC.polyline.filter(([lat, lng]) => lat < -23.535 && lat > -23.542 && lng > -47.484);
  console.log(`\nVerificação de desvios no Tatiana: Bairro=${tatianaB.length}, Centro=${tatianaC.length}`);
}

main().catch(console.error);
