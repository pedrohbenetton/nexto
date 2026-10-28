const fs = require('fs');

const html = fs.readFileSync('scripts/line80_static.html', 'utf8');
const stopRegex = /<div[^>]*data-stop-id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
let match;
let i = 0;
while ((match = stopRegex.exec(html)) !== null) {
  i++;
  const raw = match[2];
  const nameMatch = raw.match(/class=["'][^"']*stop-name[^"']*["'][^>]*>(.*?)<\/p>/i);
  const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : 'NO NAME';
  console.log(`${i}. [${match[1].slice(0, 8)}] ${name}`);
}
