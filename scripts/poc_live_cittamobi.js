const axios = require('axios');
const protobuf = require('protobufjs');
const path = require('path');

const TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6";
const CORE_BASE = "https://core.cittamobi.com.br";

const client = axios.create({
  baseURL: CORE_BASE,
  headers: {
    "username": TOKEN,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://linhas.cittamobi.com.br/"
  },
  responseType: "arraybuffer",
  timeout: 10000
});

async function main() {
  console.log("==================================================================");
  console.log("🚀 Cittamobi API - Prova de Conceito (PoC) & Decodificação Protobuf");
  console.log("==================================================================\n");

  const protoPath = path.join(__dirname, '..', 'proto', 'cittamobi_core.proto');
  console.log(`Carregando esquema Protobuf: ${protoPath}`);
  const root = await protobuf.load(protoPath);

  const CitiesProto = root.lookupType("br.com.cittamobi.core.CitiesProto");
  const LineRoutesServiceSearchesProto = root.lookupType("br.com.cittamobi.core.LineRoutesServiceSearchesProto");
  const ServicePredictionsProto = root.lookupType("br.com.cittamobi.core.ServicePredictionsProto");
  const PlacesSearchProto = root.lookupType("br.com.cittamobi.core.PlacesSearchProto");

  // 1. Teste de Busca de Cidade
  console.log("\n[1/4] Testando: Busca de Cidades (Termo: 'Sorocaba')...");
  try {
    const resCity = await client.get(`/predigo/city/proto/search?name=${encodeURIComponent('Sorocaba')}`);
    const decodedCity = CitiesProto.decode(new Uint8Array(resCity.data));
    const cityJson = CitiesProto.toObject(decodedCity, { defaults: true });
    console.log("✅ Cidades encontradas:", JSON.stringify(cityJson, null, 2));
  } catch (err) {
    console.error("❌ Falha na busca de cidades:", err.message);
  }

  // 2. Teste de Autocomplete de Locais / Paradas
  console.log("\n[2/4] Testando: Autocomplete de Locais (Termo: 'Paulista')...");
  try {
    const resAuto = await client.get(`/tripplanner/proto/autocomplete?term=Paulista`);
    const decodedAuto = PlacesSearchProto.decode(new Uint8Array(resAuto.data));
    const autoJson = PlacesSearchProto.toObject(decodedAuto, { defaults: true });
    console.log(`✅ Locais encontrados: ${autoJson.places ? autoJson.places.length : 0}`);
    if (autoJson.places && autoJson.places.length > 0) {
      console.log("Exemplo de local retornado:", autoJson.places[0]);
    }
  } catch (err) {
    console.error("❌ Falha no autocomplete:", err.message);
  }

  // 3. Teste de Linhas da Cidade (Sorocaba cityId = 35)
  console.log("\n[3/4] Testando: Linhas de Ônibus de Sorocaba (cityId: 35)...");
  try {
    const resLines = await client.get(`/linesroutes/service/city/all?cityId=35`);
    const decodedLines = LineRoutesServiceSearchesProto.decode(new Uint8Array(resLines.data));
    const linesJson = LineRoutesServiceSearchesProto.toObject(decodedLines, { defaults: true });
    const count = linesJson.searchResult ? linesJson.searchResult.length : 0;
    console.log(`✅ Linhas mapeadas em Sorocaba: ${count}`);
    if (count > 0) {
      console.log("Primeiras 3 linhas:", linesJson.searchResult.slice(0, 3));
    }
  } catch (err) {
    console.error("❌ Falha na busca de linhas:", err.message);
  }

  // 4. Teste de Previsão em Tempo Real (ETA e GPS dos Ônibus)
  console.log("\n[4/4] Testando: Previsão em Tempo Real & Posição GPS de Veículos...");
  const serviceId = "ea17e96a-7d44-4ebd-8cc3-ee6159965b0d"; // Linha 80 UFSCAR
  const stopId = "03029557-6609-11ed-98db-5adc55d213d0"; // Parada de teste
  try {
    const resPred = await client.get(`/linesroutes/service/predictions?serviceId=${serviceId}&stopId=${stopId}`);
    const decodedPred = ServicePredictionsProto.decode(new Uint8Array(resPred.data));
    const predJson = ServicePredictionsProto.toObject(decodedPred, { defaults: true });
    console.log("✅ Previsão recebida com sucesso!");
    console.log(`  Linha: ${predJson.routeCode} - ${predJson.routeMnemonic}`);
    console.log(`  Sentido: ${predJson.serviceMnemonic}`);
    console.log(`  Veículos ativos: ${predJson.activeVehicles}`);
    console.log(`  Veículos programados: ${predJson.scheduledVehicles}`);
    console.log(`  Possui tempo real: ${predJson.hasRealTime}`);
    if (predJson.vehicles && predJson.vehicles.length > 0) {
      console.log(`  🚗 Veículos detectados (${predJson.vehicles.length}):`);
      predJson.vehicles.forEach((v, idx) => {
        console.log(`    [#${idx + 1}] ID: ${v.vehicleId} | Placa: ${v.licensePlate} | ETA: ${v.minutesUntilArrival} min (${v.secondsUntilArrival}s) | Lat: ${v.currentLat}, Lng: ${v.currentLng} | RealTime: ${v.isRealTime}`);
      });
    } else {
      console.log("  (Nenhum veículo em rota ou emitindo sinal neste ponto no momento atual)");
    }
  } catch (err) {
    console.error("❌ Falha na busca de previsões:", err.message);
  }

  console.log("\n==================================================================");
  console.log("🎉 Teste PoC Concluído com Sucesso!");
  console.log("==================================================================");
}

main().catch(err => {
  console.error("Erro fatal na execução da PoC:", err);
  process.exit(1);
});
