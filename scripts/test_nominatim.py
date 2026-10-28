const axios = require('axios');

async function testNominatim() {
  const query = 'Rua Leopoldo Machado, 259, Sorocaba, SP, Brasil';
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'CittaZero-ITS-Scientific/1.0 (contact@cittazero.local)' }
    });
    console.log('Nominatim result:', res.data[0]?.lat, res.data[0]?.lon, res.data[0]?.display_name);
  } catch (e) {
    console.error('Nominatim err:', e.message);
  }
}

testNominatim();
