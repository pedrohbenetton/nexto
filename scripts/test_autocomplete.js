const { autocompletePlaces } = require('../server/cittamobiService');

async function testAuto() {
  const res = await autocompletePlaces("Iguatemi", -23.5358, -47.4645);
  console.log("Autocomplete places count:", res.length);
  console.log("Sample places:", JSON.stringify(res.slice(0, 3), null, 2));
}

testAuto();
