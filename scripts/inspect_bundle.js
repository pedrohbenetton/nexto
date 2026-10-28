const axios = require('axios');
const fs = require('fs');

async function main() {
  console.log('Downloading bundle...');
  const res = await axios.get('https://linhas.cittamobi.com.br/main.6231f614a255aee3.js');
  fs.writeFileSync('scripts/cittamobi_main.js', res.data, 'utf8');
  console.log('Saved main.js, size:', res.data.length);

  const text = res.data;
  // Look for endpoints
  const matches = text.match(/https?:\/\/[a-zA-Z0-9.-]+[^\s"'`)]+/g) || [];
  const unique = [...new Set(matches)];
  console.log('Total URLs found:', unique.length);
  unique.filter(u => u.includes('cittamobi')).forEach(u => console.log(' -', u));

  // Look for strings containing /linesroutes or /routes or /stops or /tripplanner or /map
  const apiPaths = text.match(/["']\/[a-zA-Z0-9_\-\/]+["']/g) || [];
  const relevantPaths = [...new Set(apiPaths)]
    .map(p => p.slice(1, -1))
    .filter(p => p.includes('route') || p.includes('line') || p.includes('stop') || p.includes('map') || p.includes('point') || p.includes('service') || p.includes('geo'));
  console.log('Relevant API paths found:', relevantPaths.slice(0, 50));
}

main().catch(console.error);
