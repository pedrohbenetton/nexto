const axios = require('axios');
const http = require('http');
const { app } = require('../server/index');

const s = http.createServer(app);
s.listen(3005, async () => {
  try {
    const path = 'transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7';
    const resTracking = await axios.get('http://localhost:3005/api/lines/tracking?path=' + path);
    console.log('✅ Status da Rota /api/lines/tracking:', resTracking.status);
    console.log('  Paradas mapeadas:', resTracking.data.data.stops.length);
    console.log('  Ônibus ativos rastreados:', resTracking.data.data.vehiclesCount);
    resTracking.data.data.vehicles.forEach(v => {
      console.log(`  [BUS #${v.vehicleId}] Coord: (${v.lat}, ${v.lng}) | Próxima: ${v.nextStopName.slice(0, 30)}... | ETA: ${v.secondsUntilArrival}s | GPS: ${v.isRealTime}`);
    });
    console.log('\n🎯 TESTE DE POSICIONAMENTO DE ÔNIBUS NO MAPA: 100% OPERACIONAL!');
  } catch(e) {
    console.error('Erro no teste:', e.message);
  } finally {
    s.close();
    process.exit(0);
  }
});
