const fs = require('fs');

const html = fs.readFileSync('scripts/line80_static.html', 'utf8');
const id = '03029557-6609-11ed-98db-5adc55d213d0';
const idx = html.indexOf(id);
const snippet = html.substring(idx, idx + 4000);
const nameMatch = snippet.match(/class=["'][^"']*stop-name[^"']*["'][^>]*>(.*?)<\/p>/i);
console.log('Stop 34 stop-name match:', nameMatch ? nameMatch[1] : 'NOT FOUND');
