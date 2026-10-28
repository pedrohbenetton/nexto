const fs = require('fs');

const html = fs.readFileSync('scripts/line80_static.html', 'utf8');
const stopRegex = /<div[^>]*data-stop-id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
let match;
let count = 0;
while ((match = stopRegex.exec(html)) !== null && count < 5) {
  count++;
  console.log(`\n=================== STOP #${count} (ID: ${match[1]}) ===================`);
  console.log(match[2]);
}
