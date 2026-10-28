const axios = require('axios');
const protobuf = require('protobufjs');
const path = require('path');

const TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6";
const CORE_BASE = "https://core.cittamobi.com.br";

const httpClient = axios.create({
  baseURL: CORE_BASE,
  headers: {
    "username": TOKEN,
    "Content-Type": "application/x-protobuf",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://linhas.cittamobi.com.br/"
  },
  responseType: "arraybuffer",
  timeout: 10000
});

async function main() {
  const protoPath = path.join(__dirname, '..', 'proto', 'cittamobi_core.proto');
  const root = await protobuf.load(protoPath);
  const TripPlanDataRequest = root.lookupType("br.com.cittamobi.core.TripPlanDataRequest");
  const TripPlanDataResponse = root.lookupType("br.com.cittamobi.core.TripPlanDataResponse");

  const reqPayload = TripPlanDataRequest.create({
    fromLat: -23.505427,
    fromLng: -47.452724,
    toLat: -23.582868,
    toLng: -47.524073,
    datetime: Date.now(),
    arriveordepart: 0,
    maxwalkdistance: 1000,
    numitineraries: 3,
    mode: ["TRANSIT", "WALK"]
  });

  const buffer = TripPlanDataRequest.encode(reqPayload).finish();
  console.log('Sending TripPlan POST, buffer length:', buffer.length);
  try {
    const res = await httpClient.post('/tripplanner/proto/plan', buffer);
    console.log('Response size:', res.data.length);
    const decoded = TripPlanDataResponse.decode(new Uint8Array(res.data));
    const obj = TripPlanDataResponse.toObject(decoded, { defaults: true });
    console.log('Decoded legs:', obj.tripplandata?.itineraries?.map(it => it.legs?.map(l => ({
      mode: l.mode,
      route: l.routeshortname,
      headsign: l.headsign,
      geomLen: l.geometrypoints?.length,
      stops: l.intermediatestopsnames?.length
    }))));
  } catch (e) {
    console.error('Trip planner error:', e.message, e.response?.status);
  }
}

main().catch(console.error);
