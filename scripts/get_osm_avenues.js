const axios = require('axios');

async function getAvenuePoints(name) {
  const q = `[out:json][timeout:25];
way["name"="${name}"](-23.59,-47.55,-23.49,-47.44);
out geom;`;
  const res = await axios.post('https://overpass-api.de/api/interpreter', 'data=' + encodeURIComponent(q), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const ways = res.data.elements || [];
  console.log(`\n=== "${name}": ${ways.length} ways found ===`);
  const points = [];
  ways.forEach(w => {
    if (w.geometry) {
      const oneWay = w.tags?.oneway || 'no';
      w.geometry.forEach(pt => points.push({ lat: pt.lat, lng: pt.lon, oneway: oneWay }));
    }
  });
  console.log(`Total coordinates on ${name}: ${points.length}`);
  return points;
}

async function main() {
  const gc = await getAvenuePoints('Avenida General Carneiro');
  const ap = await getAvenuePoints('Avenida Doutor Armando Pannunzio');
  const sp = await getAvenuePoints('Rodovia João Leme dos Santos');

  console.log('GC sample:', gc[0], gc[Math.floor(gc.length / 2)], gc[gc.length - 1]);
  console.log('AP sample:', ap[0], ap[Math.floor(ap.length / 2)], ap[ap.length - 1]);
}

main().catch(console.error);
