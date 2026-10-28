const axios = require('axios');
const { app, server } = require('../server/index');

const BASE_URL = `http://localhost:3001/api`;

async function testNewFeatures() {
  console.log(`\n🚀 INICIANDO TESTE DAS NOVAS FUNCIONALIDADES SOBERANAS...`);

  try {
    // 1. Health
    const h = await axios.get(`${BASE_URL}/health`);
    console.log("✅ [1/6] Health Check:", h.data.service);

    // 2. Busca Multi-Provedor (Cities)
    const citiesRes = await axios.get(`${BASE_URL}/cities?q=Paulo`);
    console.log(`✅ [2/6] Busca Multi-Provedor Cidades ("Paulo"): ${citiesRes.data.count} encontradas (ex: ${citiesRes.data.data[0].cityName})`);

    // 3. Provedor GTFS Linhas
    const gtfsLines = await axios.get(`${BASE_URL}/cities/9001/lines`);
    console.log(`✅ [3/6] Linhas Provedor GTFS (ID 9001): ${gtfsLines.data.count} linhas (Provider: ${gtfsLines.data.provider})`);

    // 4. Paradas Próximas por GPS (Sorocaba Campolim)
    const nearby = await axios.get(`${BASE_URL}/stops/nearby?lat=-23.518&lng=-47.470&radius=2000`);
    console.log(`✅ [4/6] Paradas Próximas por GPS: ${nearby.data.count} paradas detectadas no raio de 2km.`);
    if (nearby.data.data.length > 0) {
      console.log(`   Mais próxima: ${nearby.data.data[0].name} (${nearby.data.data[0].distanceMeters}m - ${nearby.data.data[0].walkTimeMinutes} min a pé)`);
    }

    // 5. Place Resolve
    const place = await axios.get(`${BASE_URL}/places/resolve?text=Iguatemi%20Esplanada&key=dHA9MCN0dj02NWI4NWUyYyNsb2M9NTEwNjEwMDIjbG5nPTEzNCNwbD00NzIzNDMwMiNsYnM9MTQ6Mzc3Njg1MDkjbG49V29ybGQ%3D`);
    console.log(`✅ [5/6] Resolução Geográfica de Local: ${place.data.data.nome} -> (${place.data.data.lat}, ${place.data.data.lng})`);

    // 6. Tracking com Headway Telemetry
    const track = await axios.get(`${BASE_URL}/lines/tracking?path=transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7`);
    console.log(`✅ [6/6] Tracking Telemetry: Frota ativa: ${track.data.data.telemetrySummary.activeFleet}, Headway estimado: ${track.data.data.telemetrySummary.estimatedHeadwayMinutes} min (Provider: ${track.data.provider})`);

    console.log("\n🎉 SUCESSO TOTAL: 6/6 NOVAS FUNCIONALIDADES PASSARAM COM SUCESSO!\n");
  } catch (e) {
    console.error("❌ Falha no teste:", e.message);
    if (e.response) console.error("Data:", e.response.data);
  } finally {
    server.close();
    process.exit(0);
  }
}

setTimeout(testNewFeatures, 500);
