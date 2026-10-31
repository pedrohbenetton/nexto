const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const cache = require('../server/cache');
const crowding = require('../server/crowdingRegistry');
const { haversineDistance, findNearbyStops } = require('../server/nearbyStops');

describe('MemoryCache', () => {
  test('retorna valor dentro do TTL e null depois de expirar', t => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    cache.set('k', 'v', 1000);
    assert.equal(cache.get('k'), 'v');
    assert.equal(cache.has('k'), true);

    t.mock.timers.tick(1001);
    assert.equal(cache.get('k'), null);
    assert.equal(cache.has('k'), false);
  });

  test('delete e clear removem entradas', () => {
    cache.set('a', 1, 60000);
    cache.set('b', 2, 60000);
    cache.delete('a');
    assert.equal(cache.get('a'), null);
    cache.clear();
    assert.equal(cache.get('b'), null);
  });
});

describe('CrowdingRegistry', () => {
  test('veículo sem reportes retorna "unknown"', () => {
    assert.deepEqual(crowding.getCrowding('sem-reportes'), {
      level: 'unknown', label: 'SEM DADOS DE LOTAÇÃO', votesCount: 0, lastReportAt: null
    });
  });

  test('ignora nível inválido', () => {
    crowding.addReport('v-invalido', 'cheio');
    assert.equal(crowding.getCrowding('v-invalido').level, 'unknown');
  });

  test('nível dominante é o mais votado', () => {
    crowding.addReport('v-maioria', 'low');
    crowding.addReport('v-maioria', 'high');
    crowding.addReport('v-maioria', 'low');
    const status = crowding.getCrowding('v-maioria');
    assert.equal(status.level, 'low');
    assert.equal(status.label, 'ASSENTOS DISPONÍVEIS');
    assert.equal(status.votesCount, 3);
  });

  test('empates favorecem o nível mais lotado', () => {
    crowding.addReport('v-empate-1', 'low');
    crowding.addReport('v-empate-1', 'medium');
    assert.equal(crowding.getCrowding('v-empate-1').level, 'medium');

    crowding.addReport('v-empate-2', 'low');
    crowding.addReport('v-empate-2', 'high');
    assert.equal(crowding.getCrowding('v-empate-2').level, 'high');
  });

  test('reportes expiram após 35 minutos', t => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    crowding.addReport('v-expira', 'high');
    assert.equal(crowding.getCrowding('v-expira').votesCount, 1);

    t.mock.timers.tick(35 * 60 * 1000);
    assert.deepEqual(crowding.getCrowding('v-expira'), {
      level: 'unknown', label: 'SEM DADOS RECENTES', votesCount: 0, lastReportAt: null
    });
  });
});

describe('nearbyStops', () => {
  test('haversineDistance retorna 0 para o mesmo ponto', () => {
    assert.equal(haversineDistance(-23.5, -47.4, -23.5, -47.4), 0);
  });

  test('haversineDistance calcula ~111 km por grau de latitude', () => {
    const d = haversineDistance(0, 0, 1, 0);
    assert.ok(Math.abs(d - 111195) < 10, `distância inesperada: ${d}`);
  });

  function mockStopCache(t, data) {
    t.mock.method(fs, 'existsSync', () => true);
    t.mock.method(fs, 'readFileSync', () => JSON.stringify(data));
  }

  test('retorna vazio quando o cache de paradas não existe', t => {
    t.mock.method(fs, 'existsSync', () => false);
    assert.deepEqual(findNearbyStops(-23.5, -47.4), []);
  });

  test('retorna vazio quando o cache está corrompido', t => {
    t.mock.method(fs, 'existsSync', () => true);
    t.mock.method(fs, 'readFileSync', () => '{corrompido');
    assert.deepEqual(findNearbyStops(-23.5, -47.4), []);
  });

  test('filtra por raio, ordena por distância e respeita o limite', t => {
    mockStopCache(t, {
      '35:Rua Longe, 100': { lat: -23.6, lng: -47.4 },     // ~11 km
      '35:Rua Perto, 10, Centro': { lat: -23.501, lng: -47.4 }, // ~111 m
      '35:Rua Media, 50': { lat: -23.505, lng: -47.4 },    // ~556 m
      '35:Sem coordenada': { lat: null, lng: -47.4 }
    });

    const stops = findNearbyStops(-23.5, -47.4, 2000, 10);
    assert.deepEqual(stops.map(s => s.name), ['RUA PERTO', 'RUA MEDIA']);
    assert.equal(stops[0].cityId, 35);
    assert.equal(stops[0].address, 'Rua Perto, 10, Centro');
    assert.equal(stops[0].walkTimeMinutes, 1);

    assert.equal(findNearbyStops(-23.5, -47.4, 2000, 1).length, 1);
  });
});
