const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const cache = require('../server/cache');
const crowding = require('../server/crowdingRegistry');
const nearbyStopsModule = require('../server/nearbyStops');
const { haversineDistance, findNearbyStops } = nearbyStopsModule;
const cittaService = require('../server/cittamobiService');
const gtfsProvider = require('../server/providers/GTFSRealtimeProvider');

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

describe('CrowdingRegistry - relatos de problemas', () => {
  test('sem relatos retorna lista vazia', () => {
    assert.deepEqual(crowding.getIssues('v-limpo'), []);
  });

  test('ignora tipo inválido', () => {
    assert.equal(crowding.addIssue('v-x', 'explodiu'), false);
    assert.deepEqual(crowding.getIssues('v-x'), []);
  });

  test('agrega contagem por tipo', () => {
    crowding.addIssue('v-ac', 'no_ac');
    crowding.addIssue('v-ac', 'no_ac');
    crowding.addIssue('v-ac', 'broken');
    const issues = crowding.getIssues('v-ac');
    const ac = issues.find(i => i.type === 'no_ac');
    assert.equal(ac.count, 2);
    assert.equal(ac.label, 'AR-CONDICIONADO NÃO FUNCIONA');
    assert.equal(issues.find(i => i.type === 'broken').count, 1);
  });

  test('relatos de ônibus expiram em 35 min; de ponto, em 3 h', t => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    crowding.addIssue('v-exp', 'broken');
    crowding.addIssue('p-exp', 'unsafe_night');
    t.mock.timers.tick(35 * 60 * 1000);
    assert.deepEqual(crowding.getIssues('v-exp'), []);
    assert.equal(crowding.getIssues('p-exp').length, 1);
    t.mock.timers.tick(3 * 60 * 60 * 1000);
    assert.deepEqual(crowding.getIssues('p-exp'), []);
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

  test('findNearbyStops preserva stopId e lines quando o cache contém entradas enriquecidas', t => {
    mockStopCache(t, {
      '35:stop-1': {
        stopId: 'stop-1',
        name: 'Av. General Carneiro, 140',
        address: 'Av. General Carneiro, 140 - Centro, Sorocaba - SP',
        lat: -23.501,
        lng: -47.4,
        lines: [{ routeCode: '80', lineRoutesPath: 'p-80' }]
      }
    });

    const stops = findNearbyStops(-23.5, -47.4, 2000, 10);
    assert.equal(stops.length, 1);
    assert.equal(stops[0].stopId, 'stop-1');
    assert.equal(stops[0].name, 'Av. General Carneiro, 140');
    assert.equal(stops[0].lines[0].routeCode, '80');
  });

  test('findNearbyStopsWithLines agrega paradas de provedor GTFS (cityId >= 9000)', async t => {
    cache.clear();
    t.mock.method(fs, 'writeFileSync', () => {});
    t.mock.method(gtfsProvider, 'getLines', async () => [
      { id: 'g1', routeCode: '8000-10', routeMnemonic: 'TERM LAPA', serviceMnemonic: 'PÇA RAMOS', lineRoutesPath: 'gtfs-8000' }
    ]);
    t.mock.method(gtfsProvider, 'getLineTracking', async () => ({
      serviceId: 'srv-gtfs-8000',
      stops: [
        { stopId: 'st-lapa', name: 'Terminal Lapa', lat: -23.5188, lng: -46.7022 },
        { stopId: 'st-longe', name: 'Praça Ramos', lat: -23.6000, lng: -46.6000 }
      ]
    }));

    const res = await nearbyStopsModule.findNearbyStopsWithLines({
      lat: -23.5190,
      lng: -46.7020,
      cityId: 9001,
      radius: 1000,
      limit: 5
    });

    assert.equal(res.length, 1);
    assert.equal(res[0].stopId, 'st-lapa');
    assert.equal(res[0].lines[0].routeCode, '8000-10');
    assert.equal(res[0].lines[0].serviceId, 'srv-gtfs-8000');
  });

  test('findNearbyStopsWithLines descobre paradas via OTP + catálogo Cittamobi e resolve stopId', async t => {
    cache.clear();
    t.mock.method(fs, 'writeFileSync', () => {});
    t.mock.method(cittaService, 'getLinesByCityId', async () => [
      { id: '1', routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: 'U F S C A R - Bairro', lineRoutesPath: 'p-80-b' }
    ]);
    t.mock.method(cittaService, 'planTripRaw', async () => ({
      haserror: false,
      itineraries: [{
        legs: [{
          mode: 'BUS',
          routeshortname: '80',
          headsign: 'U F S C A R - Bairro',
          routelongname: 'Ufscar',
          stopfromname: 'Av. Dr. Armando Pannunzio, 1700 - Jardim Piazza Di Roma, Sorocaba - SP, 18050-000, Brasil',
          stopfromlat: -23.5282,
          stopfromlng: -47.4902,
          intermediatestopsnames: [],
          intermediatestopslat: [],
          intermediatestopslng: []
        }]
      }]
    }));
    t.mock.method(cittaService, 'getLineDetails', async () => ({
      serviceId: 'srv-80-b',
      stops: [
        { index: 0, stopId: 'stop-1700', name: 'Av. Dr. Armando Pannunzio, 1700 - Jardim Piazza Di Roma, Sorocaba - SP' }
      ]
    }));

    const res = await nearbyStopsModule.findNearbyStopsWithLines({
      lat: -23.5279,
      lng: -47.4914,
      cityId: 35,
      radius: 2000,
      limit: 8
    });

    assert.equal(res.length, 1);
    assert.equal(res[0].stopId, 'stop-1700');
    assert.equal(res[0].lines.length, 1);
    assert.equal(res[0].lines[0].lineRoutesPath, 'p-80-b');
    assert.equal(res[0].lines[0].serviceId, 'srv-80-b');
  });
});
