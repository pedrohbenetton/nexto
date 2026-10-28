const path = require('path');
const citta = require(path.join(__dirname, '..', 'server', 'cittamobiService'));

async function main() {
  const details = await citta.getLineDetails('transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604');
  console.log('Total Centro stops:', details.stops.length);
  details.stops.forEach((s, i) => console.log((i + 1) + '. [' + s.stopId.slice(0, 8) + '] ' + s.name));
}

main().catch(console.error);
