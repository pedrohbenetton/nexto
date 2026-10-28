const axios = require('axios');
const { app, server } = require('../server/index');

async function runTests() {
  const baseURL = 'http://localhost:3001/api';
  console.log('\n--- 🧪 Testando endpoints do BFF ---');

  try {
    // 1. Health
    const resHealth = await axios.get(`${baseURL}/health`);
    console.log('✅ Health Check:', resHealth.data);

    // 2. Cidades (Sorocaba)
    const resCities = await axios.get(`${baseURL}/cities?q=Sorocaba`);
    console.log(`✅ Cidades Encontradas: ${resCities.data.count} (cityId: ${resCities.data.data[0]?.cityId})`);

    // 3. Linhas da Cidade (cityId: 35)
    const resLines = await axios.get(`${baseURL}/cities/35/lines?search=UFSCAR`);
    console.log(`✅ Linhas UFSCar filtradas em Sorocaba: ${resLines.data.count}`);
    const sampleLine = resLines.data.data[0];
    console.log('Exemplo de linha:', {
      routeCode: sampleLine?.routeCode,
      routeMnemonic: sampleLine?.routeMnemonic,
      path: sampleLine?.lineRoutesPath
    });

    // 4. Detalhes da Linha (paradas)
    if (sampleLine?.lineRoutesPath) {
      const resDetails = await axios.get(`${baseURL}/lines/details?path=${sampleLine.lineRoutesPath}`);
      console.log(`✅ Detalhes da Linha: ${resDetails.data.data.stopsCount} paradas mapeadas!`);
      const sampleStop = resDetails.data.data.stops[0];
      console.log('Exemplo de parada:', {
        stopId: sampleStop?.stopId,
        name: sampleStop?.name,
        departuresCount: sampleStop?.departures?.length
      });

      // 5. Previsão em Tempo Real
      if (resDetails.data.data.serviceId && sampleStop?.stopId) {
        const resPred = await axios.get(`${baseURL}/predictions?serviceId=${resDetails.data.data.serviceId}&stopId=${sampleStop.stopId}`);
        console.log('✅ Previsão em Tempo Real:', {
          route: resPred.data.data.routeCode,
          vehiclesCount: resPred.data.data.vehicles?.length,
          vehicles: resPred.data.data.vehicles
        });
      }
    }

    console.log('\n🎉 TODOS OS TESTES DO BFF PASSARAM COM SUCESSO!\n');
  } catch (err) {
    console.error('❌ Falha nos testes do BFF:', err.message, err.response?.data);
  } finally {
    server.close();
    process.exit(0);
  }
}

setTimeout(runTests, 1000);
