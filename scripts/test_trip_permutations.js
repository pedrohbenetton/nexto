const axios = require('axios');
const protobuf = require('protobufjs');
const path = require('path');

const TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6";
const CORE_BASE = "https://core.cittamobi.com.br";

async function testPermutations() {
  const protoPath = path.join(__dirname, '..', 'proto', 'cittamobi_core.proto');
  const root = await protobuf.load(protoPath);
  const TripPlanDataProto = root.lookupType("br.com.cittamobi.core.TripPlanDataProto");

  // Sorocaba: Campolim Shopping Iguatemi (-23.5358, -47.4645) -> Terminal Santo Antonio (-23.4975, -47.4589)
  const baseReq = {
    fromLat: -23.5358,
    fromLng: -47.4645,
    toLat: -23.4975,
    toLng: -47.4589,
    datetime: Math.floor(Date.now() / 1000), // seconds
    arriveordepart: 0,
    maxwalkdistance: 800,
    numitineraries: 3,
    mode: ["TRANSIT", "WALK"]
  };

  const variations = [
    { name: "seconds ts", req: { ...baseReq } },
    { name: "ms ts", req: { ...baseReq, datetime: Date.now() } },
    { name: "mode: [BUS]", req: { ...baseReq, mode: ["BUS"] } },
    { name: "mode: [TRANSIT]", req: { ...baseReq, mode: ["TRANSIT"] } },
    { name: "mode: []", req: { ...baseReq, mode: [] } },
    { name: "camelCase", req: {
        fromLat: -23.5358,
        fromLng: -47.4645,
        toLat: -23.4975,
        toLng: -47.4589,
        dateTime: Date.now(),
        arriveOrDepart: 0,
        maxWalkDistance: 800,
        numItineraries: 3,
        mode: ["TRANSIT", "WALK"]
      }
    },
    { name: "São Paulo test (Pinheiros to Paulista)", req: {
        fromLat: -23.5614,
        fromLng: -46.6922,
        toLat: -23.5630,
        toLng: -46.6543,
        datetime: Date.now(),
        arriveordepart: 0,
        maxwalkdistance: 1000,
        numitineraries: 3,
        mode: ["TRANSIT", "WALK"]
      }
    }
  ];

  for (const v of variations) {
    try {
      const res = await axios.post(`${CORE_BASE}/tripplanner/proto/plan`, v.req, {
        headers: {
          "username": TOKEN,
          "Content-Type": "application/json; charset=utf-8",
          "User-Agent": "Mozilla/5.0"
        },
        responseType: "arraybuffer",
        timeout: 7000
      });
      const decoded = TripPlanDataProto.decode(new Uint8Array(res.data));
      const obj = TripPlanDataProto.toObject(decoded, { defaults: true });
      console.log(`[${v.name}] hasError: ${obj.haserror}, itineraries: ${obj.itineraries?.length || 0}, errMsg: ${obj.errormsg || 'none'}`);
      if (!obj.haserror && obj.itineraries && obj.itineraries.length > 0) {
        console.log(`🎉 SUCCESS with variation: ${v.name}`);
        console.log(JSON.stringify(obj.itineraries[0], null, 2).slice(0, 500));
        break;
      }
    } catch (e) {
      console.log(`[${v.name}] HTTP ERR: ${e.response ? e.response.status : e.message}`);
    }
  }
}

testPermutations();
