const fs = require('fs');

const html = fs.readFileSync('scripts/line80_cittamobi.html', 'utf8');
const match = html.match(/<script id="serverApp-state"[^>]*>([\s\S]*?)<\/script>/i);
if (match) {
  let raw = match[1];
  // Replace HTML entities like &q; or &quot;
  raw = raw.replace(/&q;/g, '"').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  fs.writeFileSync('scripts/serverApp-state.json', raw, 'utf8');
  console.log('Saved serverApp-state.json, length:', raw.length);
  try {
    const data = JSON.parse(raw);
    console.log('Top keys in serverApp-state:', Object.keys(data));
    for (const k of Object.keys(data)) {
      if (typeof data[k] === 'object') {
        console.log(k, 'keys:', Object.keys(data[k]));
      } else {
        console.log(k, ':', typeof data[k]);
      }
    }
  } catch (err) {
    console.error('JSON parse error:', err.message);
  }
} else {
  console.log('serverApp-state not found');
}
