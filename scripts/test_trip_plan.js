const axios = require('axios');
const protobuf = require('protobufjs');
const path = require('path');

const TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6";
const CORE_BASE = "https://core.cittamobi.com.br";

async function testTripPlan() {
  const protoPath = path.join(__dirname, '..', 'proto', 'cittamobi_core.proto');
  const root = await protobuf.load(protoPath);
  
  const TripPlanDataProto = root.lookupType("br.com.cittamobi.core.TripPlanDataProto");
  const TripPlanDataResponse = root.lookupType("br.com.cittamobi.core.TripPlanDataResponse");

  const reqPayload = {
    fromLat: -23.5358,
    fromLng: -47.4645,
    toLat: -23.4975,
    toLng: -47.4589,
    datetime: Date.now(),
    arriveordepart: 0,
    maxwalkdistance: 1000,
    numitineraries: 3,
    mode: ["TRANSIT", "WALK"]
  };

  const res = await axios.post(`${CORE_BASE}/tripplanner/proto/plan`, reqPayload, {
    headers: {
      "username": TOKEN,
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://linhas.cittamobi.com.br/"
    },
    responseType: "arraybuffer",
    timeout: 10000
  });

  const buffer = new Uint8Array(res.data);
  console.log("Bytes hex:", Buffer.from(buffer).toString('hex'));

  try {
    const d1 = TripPlanDataProto.decode(buffer);
    console.log("Decoded as TripPlanDataProto:", JSON.stringify(TripPlanDataProto.toObject(d1, { defaults: true }), null, 2));
  } catch (e) {
    console.log("Fail TripPlanDataProto:", e.message);
  }

  try {
    const d2 = TripPlanDataResponse.decode(buffer);
    console.log("Decoded as TripPlanDataResponse:", JSON.stringify(TripPlanDataResponse.toObject(d2, { defaults: true }), null, 2));
  } catch (e) {
    console.log("Fail TripPlanDataResponse:", e.message);
  }
}

testTripPlan();
