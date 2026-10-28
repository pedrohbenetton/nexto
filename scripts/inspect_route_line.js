const axios = require('axios');
const fs = require('fs');

async function main() {
  console.log('Downloading route-line.js...');
  const res = await axios.get('https://linhas.cittamobi.com.br/route-line.js?v=20260714a');
  fs.writeFileSync('scripts/route-line.js', res.data, 'utf8');
  console.log('Saved route-line.js, size:', res.data.length);

  const text = res.data;
  // Look for any API endpoints, map providers, tiles, or protobuf calls
  const matches = text.match(/https?:\/\/[a-zA-Z0-9.-]+[^\s"'`)]+/g) || [];
  console.log('URLs in route-line.js:', [...new Set(matches)]);

  // Look for function names or variable names
  const keywords = ['map', 'marker', 'vehicle', 'bus', 'realtime', 'prediction', 'itinerary', 'polyline', 'coordinates', 'stop', 'lat', 'lng'];
  keywords.forEach(kw => {
    const r = new RegExp(`\\b${kw}\\b`, 'gi');
    const count = (text.match(r) || []).length;
    console.log(`Keyword "${kw}":`, count);
  });
}

main().catch(console.error);
