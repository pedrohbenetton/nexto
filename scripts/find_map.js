const fs = require('fs');

const html = fs.readFileSync('scripts/line80_cittamobi.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('.webp') || l.includes('map') || l.includes('mapa') || l.includes('route-map')) {
    console.log('Line ' + (i + 1) + ': ' + l.trim().substring(0, 150));
  }
});
