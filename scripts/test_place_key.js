const axios = require('axios');
const protobuf = require('protobufjs');
const path = require('path');

const TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6";
const CORE_BASE = "https://core.cittamobi.com.br";

async function testPlaceKey() {
  const text = "Iguatemi Esplanada";
  const key = "dHA9MCN0dj02NWI4NWUyYyNsb2M9NTEwNjEwMDIjbG5nPTEzNCNwbD00NzIzNDMwMiNsYnM9MTQ6Mzc3Njg1MDkjbG49V29ybGQ=";
  
  const url = `${CORE_BASE}/tripplanner/proto/place/key?text=${encodeURIComponent(text)}&key=${encodeURIComponent(key)}`;
  console.log("Fetching:", url);

  const res = await axios.get(url, {
    headers: {
      "username": TOKEN,
      "User-Agent": "Mozilla/5.0"
    },
    responseType: "arraybuffer"
  });

  console.log("Status:", res.status, "Length:", res.data.length);
  const protoPath = path.join(__dirname, '..', 'proto', 'cittamobi_core.proto');
  const root = await protobuf.load(protoPath);
  const PlacesLocationProto = root.lookupType("br.com.cittamobi.core.PlacesLocationProto");
  
  const decoded = PlacesLocationProto.decode(new Uint8Array(res.data));
  console.log("Decoded:", JSON.stringify(PlacesLocationProto.toObject(decoded), null, 2));
}

testPlaceKey();
