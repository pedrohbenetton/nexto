const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const BaseTransitProvider = require('../server/providers/BaseTransitProvider');
const registry = require('../server/providers/ProviderRegistry');
const cittaProvider = require('../server/providers/CittamobiProvider');
const gtfsProvider = require('../server/providers/GTFSRealtimeProvider');
const cittaService = require('../server/cittamobiService');

describe('BaseTransitProvider', () => {
  const methods = [
    ['searchCities', ['x']],
    ['getLines', [1]],
    ['getLineDetails', ['p']],
    ['getLineTracking', ['p', 's', 1]],
    ['getStopPredictions', ['s', 'st']],
    ['autocompletePlaces', ['t', 0, 0]]
  ];

  for (const [method, args] of methods) {
    test(`${method} rejeita com "not implemented" e o nome do provider`, async () => {
      const provider = new BaseTransitProvider('Fake');
      await assert.rejects(provider[method](...args), { message: `Fake: ${method} not implemented` });
    });
  }
});

describe('ProviderRegistry', () => {
  test('getProviderForCity usa GTFS para cityId >= 9000', () => {
    assert.equal(registry.getProviderForCity(9000), gtfsProvider);
    assert.equal(registry.getProviderForCity('9001'), gtfsProvider);
  });

  test('getProviderForCity usa Cittamobi para cityId < 9000 ou inválido', () => {
    assert.equal(registry.getProviderForCity(35), cittaProvider);
    assert.equal(registry.getProviderForCity('8999'), cittaProvider);
    assert.equal(registry.getProviderForCity('abc'), cittaProvider);
  });

  test('getProviderForLine usa GTFS apenas para paths com prefixo "gtfs-"', () => {
    assert.equal(registry.getProviderForLine('gtfs-sp-8000-10'), gtfsProvider);
    assert.equal(registry.getProviderForLine('sorocaba/linha-80'), cittaProvider);
    assert.equal(registry.getProviderForLine(undefined), cittaProvider);
  });

  test('searchCitiesAcrossAll concatena GTFS antes de Cittamobi', async t => {
    t.mock.method(cittaProvider, 'searchCities', async () => [{ cityId: 35, cityName: 'Sorocaba' }]);
    t.mock.method(gtfsProvider, 'searchCities', async () => [{ cityId: 9001, cityName: 'São Paulo (GTFS Aberto)' }]);

    const cities = await registry.searchCitiesAcrossAll('s');
    assert.deepEqual(cities.map(c => c.cityId), [9001, 35]);
  });

  test('searchCitiesAcrossAll ignora provider que falha', async t => {
    t.mock.method(cittaProvider, 'searchCities', async () => { throw new Error('rede fora'); });
    t.mock.method(gtfsProvider, 'searchCities', async () => [{ cityId: 9002 }]);

    assert.deepEqual(await registry.searchCitiesAcrossAll('rio'), [{ cityId: 9002 }]);
  });
});

describe('CittamobiProvider', () => {
  test('tem nome "Cittamobi" e herda de BaseTransitProvider', () => {
    assert.equal(cittaProvider.name, 'Cittamobi');
    assert.ok(cittaProvider instanceof BaseTransitProvider);
  });

  const delegations = [
    ['searchCities', 'searchCities', ['soro']],
    ['getLines', 'getLinesByCityId', [35]],
    ['getLineDetails', 'getLineDetails', ['path']],
    ['getLineTracking', 'getLineTracking', ['path', 'srv', 35]],
    ['getStopPredictions', 'getStopPredictions', ['srv', 'stop']],
    ['autocompletePlaces', 'autocompletePlaces', ['term', -23.5, -47.4]]
  ];

  for (const [method, serviceFn, args] of delegations) {
    test(`${method} delega para cittamobiService.${serviceFn}`, async t => {
      const fake = t.mock.method(cittaService, serviceFn, async () => 'ok');
      assert.equal(await cittaProvider[method](...args), 'ok');
      assert.equal(fake.mock.callCount(), 1);
      assert.deepEqual(fake.mock.calls[0].arguments, args);
    });
  }
});

describe('GTFSRealtimeProvider', () => {
  test('searchCities encontra São Paulo e Rio por nome ou sigla', async () => {
    assert.deepEqual((await gtfsProvider.searchCities('Paulo')).map(c => c.cityId), [9001]);
    assert.deepEqual((await gtfsProvider.searchCities('RJ')).map(c => c.cityId), [9002]);
  });

  test('searchCities retorna vazio para cidade não coberta', async () => {
    assert.deepEqual(await gtfsProvider.searchCities('sorocaba'), []);
  });

  test('getLines retorna linhas com lineRoutesPath roteável para o próprio provider', async () => {
    const lines = await gtfsProvider.getLines(9001);
    assert.ok(lines.length > 0);
    for (const line of lines) {
      assert.equal(registry.getProviderForLine(line.lineRoutesPath), gtfsProvider);
    }
  });

  test('getLineTracking usa o serviceId recebido ou deriva do path', async () => {
    assert.equal((await gtfsProvider.getLineTracking('gtfs-x', 'srv-1', 9001)).serviceId, 'srv-1');
    assert.equal((await gtfsProvider.getLineTracking('gtfs-x', undefined, 9001)).serviceId, 'gtfs-gtfs-x');
  });

  test('getStopPredictions ecoa serviceId e stopId', async () => {
    const p = await gtfsProvider.getStopPredictions('srv', 'stop');
    assert.equal(p.serviceId, 'srv');
    assert.equal(p.stopId, 'stop');
  });

  test('autocompletePlaces retorna vazio', async () => {
    assert.deepEqual(await gtfsProvider.autocompletePlaces('x'), []);
  });
});
