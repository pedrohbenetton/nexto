const citta = require('../server/cittamobiService');

async function testActiveVehicles() {
  const linePath = 'transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7';
  console.log(`Buscando detalhes da linha ${linePath}...`);
  const details = await citta.getLineDetails(linePath);
  console.log(`ServiceId: ${details.serviceId}, Total de Paradas: ${details.stops.length}`);

  // Consulta previsões em paralelo para as primeiras 10 paradas
  console.log('Varrendo paradas para detectar veículos ativos na rota...');
  const activeVehiclesMap = new Map();

  const sampleStops = details.stops.slice(0, 15);
  await Promise.all(sampleStops.map(async (stop) => {
    try {
      const pred = await citta.getStopPredictions(details.serviceId, stop.stopId);
      if (pred && pred.vehicles) {
        pred.vehicles.forEach(v => {
          if (!activeVehiclesMap.has(v.vehicleId)) {
            activeVehiclesMap.set(v.vehicleId, {
              ...v,
              closestStop: {
                index: stop.index,
                stopId: stop.stopId,
                name: stop.name
              }
            });
          } else {
            // Se o tempo até esta parada for menor, atualiza para a parada mais próxima
            const existing = activeVehiclesMap.get(v.vehicleId);
            if (v.secondsUntilArrival < existing.secondsUntilArrival) {
              activeVehiclesMap.set(v.vehicleId, {
                ...v,
                closestStop: {
                  index: stop.index,
                  stopId: stop.stopId,
                  name: stop.name
                }
              });
            }
          }
        });
      }
    } catch (e) {
      // Ignorar parada individual
    }
  }));

  console.log(`\n🎉 Veículos únicos ativos detectados na linha: ${activeVehiclesMap.size}`);
  activeVehiclesMap.forEach((v, id) => {
    console.log(`- Prefixo ${id}: ETA ${v.secondsUntilArrival}s (${Math.ceil(v.secondsUntilArrival/60)} min) -> Próxima Parada: #${v.closestStop.index + 1} "${v.closestStop.name}" | RealTime: ${v.isRealTime}`);
  });
}

testActiveVehicles().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
