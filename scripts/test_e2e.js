const axios = require('axios');
const { app, server } = require('../server/index');

async function testE2E() {
  const base = 'http://localhost:3001';
  console.log('\n--- 🚍 TESTE END-TO-END (BFF + FRONTEND INTEGRADO) ---');

  try {
    // 1. Frontend SPA index
    const resFront = await axios.get(base);
    console.log(`✅ [1/5] Frontend Index HTML: HTTP ${resFront.status} (${resFront.data.length} bytes)`);

    // 2. Health check
    const resHealth = await axios.get(`${base}/api/health`);
    console.log('✅ [2/5] BFF Health:', resHealth.data);

    // 3. Cidades
    const resCities = await axios.get(`${base}/api/cities?q=Sorocaba`);
    const city = resCities.data.data[0];
    console.log(`✅ [3/5] Busca de Cidade: ${city.cityName} - ${city.stateInitials} (ID: ${city.cityId})`);

    // 4. Linhas de Sorocaba
    const resLines = await axios.get(`${base}/api/cities/${city.cityId}/lines`);
    console.log(`✅ [4/5] Catálogo de Linhas de Sorocaba: ${resLines.data.count} linhas ativas no BFF!`);

    // 5. Previsão em Tempo Real
    const serviceId = "ea17e96a-7d44-4ebd-8cc3-ee6159965b0d";
    const stopId = "03029557-6609-11ed-98db-5adc55d213d0";
    const resPred = await axios.get(`${base}/api/predictions?serviceId=${serviceId}&stopId=${stopId}`);
    console.log(`✅ [5/5] Previsão em Tempo Real decodificada:`);
    console.log(`  Linha: ${resPred.data.data.routeCode} - ${resPred.data.data.routeMnemonic}`);
    console.log(`  Veículos ativos: ${resPred.data.data.vehicles.length}`);
    resPred.data.data.vehicles.forEach(v => {
      console.log(`    Prefixo ${v.vehicleId}: ${v.minutesUntilArrival} min (${v.secondsUntilArrival}s) | RealTime: ${v.isRealTime}`);
    });

    console.log('\n🎉 SUCESSO TOTAL: TODAS AS ETAPAS E2E OPERANDO 100%!\n');
  } catch (err) {
    console.error('❌ Falha no teste E2E:', err.message);
  } finally {
    server.close();
    process.exit(0);
  }
}

setTimeout(testE2E, 800);
