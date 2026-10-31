const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

const { startApi } = require('./helpers/server');
const cittaProvider = require('../server/providers/CittamobiProvider');
const gtfsProvider = require('../server/providers/GTFSRealtimeProvider');
const cittaService = require('../server/cittamobiService');
const nearbyStops = require('../server/nearbyStops');

let api;
before(async () => { api = await startApi(); });
after(() => api.close());

async function json(resPromise) {
  const res = await resPromise;
  return { status: res.status, body: await res.json() };
}

const LINES = [
  { routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: 'CENTRO' },
  { routeCode: '80', routeMnemonic: 'CENTRO', serviceMnemonic: 'UFSCAR' },
  { routeCode: '44', routeMnemonic: 'EDEN', serviceMnemonic: 'TERMINAL' }
];

describe('GET /api e /api/health', () => {
  test('raiz lista endpoints', async () => {
    const { status, body } = await json(api.get('/'));
    assert.equal(status, 200);
    assert.equal(body.status, 'online');
    assert.ok(body.endpoints.health);
  });

  test('health retorna ok com timestamp ISO', async () => {
    const { status, body } = await json(api.get('/health'));
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
  });
});

describe('GET /api/cities', () => {
  test('400 sem parâmetro q', async () => {
    assert.equal((await api.get('/cities')).status, 400);
    assert.equal((await api.get('/cities?q=%20%20')).status, 400);
  });

  test('aceita q ou name e retorna cidades de todos os providers', async t => {
    t.mock.method(cittaProvider, 'searchCities', async () => [{ cityId: 35 }]);
    t.mock.method(gtfsProvider, 'searchCities', async () => []);

    for (const qs of ['q=soro', 'name=soro']) {
      const { status, body } = await json(api.get(`/cities?${qs}`));
      assert.equal(status, 200);
      assert.deepEqual(body, { success: true, count: 1, data: [{ cityId: 35 }] });
    }
  });
});

describe('GET /api/cities/detect', () => {
  test('400 sem lat/lng', async () => {
    assert.equal((await api.get('/cities/detect?lat=1')).status, 400);
  });

  test('repassa resposta da sessão Cittamobi', async t => {
    const get = t.mock.method(axios, 'get', async () => ({ data: { cityId: 35 } }));
    const { status, body } = await json(api.get('/cities/detect?lat=-23.5&lng=-47.4'));
    assert.equal(status, 200);
    assert.deepEqual(body.data, { cityId: 35 });
    assert.match(get.mock.calls[0].arguments[0], /lat=-23\.5&lng=-47\.4$/);
  });

  test('500 quando a API externa falha', async t => {
    t.mock.method(axios, 'get', async () => { throw new Error('timeout'); });
    const { status, body } = await json(api.get('/cities/detect?lat=1&lng=2'));
    assert.equal(status, 500);
    assert.equal(body.error, 'timeout');
  });
});

describe('GET /api/cities/:cityId/lines', () => {
  beforeEach(t => { t.mock.method(console, 'error', () => {}); });

  test('usa Cittamobi para cidades comuns e filtra por search (case-insensitive)', async t => {
    t.mock.method(cittaProvider, 'getLines', async () => LINES);
    const { status, body } = await json(api.get('/cities/35/lines?search=eden'));
    assert.equal(status, 200);
    assert.equal(body.provider, 'Cittamobi');
    assert.equal(body.total, 3);
    assert.equal(body.count, 1);
    assert.equal(body.data[0].routeCode, '44');
  });

  test('sem search retorna todas as linhas', async t => {
    t.mock.method(cittaProvider, 'getLines', async () => LINES);
    const { body } = await json(api.get('/cities/35/lines'));
    assert.equal(body.count, 3);
  });

  test('usa GTFS para cityId >= 9000', async () => {
    const { body } = await json(api.get('/cities/9001/lines'));
    assert.equal(body.provider, 'GTFS-Realtime');
    assert.ok(body.count > 0);
  });

  test('500 quando o provider falha', async t => {
    t.mock.method(cittaProvider, 'getLines', async () => { throw new Error('falhou'); });
    const { status, body } = await json(api.get('/cities/35/lines'));
    assert.equal(status, 500);
    assert.deepEqual(body, { success: false, error: 'falhou' });
  });
});

describe('GET /api/lines/details', () => {
  test('400 sem path', async () => {
    assert.equal((await api.get('/lines/details')).status, 400);
  });

  test('roteia path gtfs- para o provider GTFS', async () => {
    const { status, body } = await json(api.get('/lines/details?path=gtfs-sp-8000'));
    assert.equal(status, 200);
    assert.equal(body.provider, 'GTFS-Realtime');
    assert.equal(body.data.lineRoutesPath, 'gtfs-sp-8000');
  });

  test('roteia demais paths para Cittamobi', async t => {
    const fake = t.mock.method(cittaProvider, 'getLineDetails', async p => ({ path: p }));
    const { body } = await json(api.get('/lines/details?path=sorocaba%2F80'));
    assert.equal(body.provider, 'Cittamobi');
    assert.deepEqual(fake.mock.calls[0].arguments, ['sorocaba/80']);
  });
});

describe('GET /api/lines/tracking', () => {
  test('400 sem path', async () => {
    assert.equal((await api.get('/lines/tracking')).status, 400);
  });

  test('calcula frota e headway médio entre veículos', async t => {
    t.mock.method(cittaProvider, 'getLineTracking', async () => ({
      vehicles: [
        { secondsUntilArrival: 1200, isRealTime: true },
        { secondsUntilArrival: 0, isRealTime: false },
        { secondsUntilArrival: 600, isRealTime: true }
      ]
    }));
    const { body } = await json(api.get('/lines/tracking?path=x&serviceId=1&cityId=35'));
    assert.deepEqual(body.data.telemetrySummary, {
      activeFleet: 3,
      realtimeFleet: 2,
      estimatedHeadwayMinutes: 10
    });
  });

  test('headway cai para 15 min com menos de 2 veículos', async t => {
    t.mock.method(cittaProvider, 'getLineTracking', async () => ({ vehicles: [] }));
    const { body } = await json(api.get('/lines/tracking?path=x'));
    assert.deepEqual(body.data.telemetrySummary, {
      activeFleet: 0, realtimeFleet: 0, estimatedHeadwayMinutes: 15
    });
  });

  test('converte cityId para inteiro e usa 35 como padrão', async t => {
    const fake = t.mock.method(cittaProvider, 'getLineTracking', async () => ({}));
    await api.get('/lines/tracking?path=x&serviceId=s&cityId=12');
    await api.get('/lines/tracking?path=x');
    assert.deepEqual(fake.mock.calls[0].arguments, ['x', 's', 12]);
    assert.deepEqual(fake.mock.calls[1].arguments, ['x', undefined, 35]);
  });
});

describe('GET /api/predictions', () => {
  test('400 sem serviceId ou stopId', async () => {
    assert.equal((await api.get('/predictions?serviceId=1')).status, 400);
    assert.equal((await api.get('/predictions?stopId=1')).status, 400);
  });

  test('retorna previsões do serviço Cittamobi', async t => {
    const fake = t.mock.method(cittaService, 'getStopPredictions', async () => ({ vehicles: [] }));
    const { status, body } = await json(api.get('/predictions?serviceId=10&stopId=20'));
    assert.equal(status, 200);
    assert.deepEqual(body, { success: true, data: { vehicles: [] } });
    assert.deepEqual(fake.mock.calls[0].arguments, ['10', '20']);
  });
});

describe('GET /api/autocomplete', () => {
  test('400 com term vazio', async () => {
    assert.equal((await api.get('/autocomplete?term=%20')).status, 400);
  });

  test('retorna lugares com contagem', async t => {
    t.mock.method(cittaService, 'autocompletePlaces', async () => [{ name: 'Terminal' }]);
    const { body } = await json(api.get('/autocomplete?term=term'));
    assert.deepEqual(body, { success: true, count: 1, data: [{ name: 'Terminal' }] });
  });
});

describe('GET /api/places/resolve', () => {
  test('400 sem text ou key', async () => {
    assert.equal((await api.get('/places/resolve?text=a')).status, 400);
  });

  test('retorna local resolvido', async t => {
    t.mock.method(cittaService, 'resolvePlace', async () => ({ lat: 1, lng: 2 }));
    const { body } = await json(api.get('/places/resolve?text=a&key=b'));
    assert.deepEqual(body.data, { lat: 1, lng: 2 });
  });
});

describe('GET /api/stops/nearby', () => {
  test('400 sem lat/lng', async () => {
    assert.equal((await api.get('/stops/nearby?lat=1')).status, 400);
  });

  test('usa raio 2500 m e limite 8 por padrão', async t => {
    const fake = t.mock.method(nearbyStops, 'findNearbyStops', () => []);
    await api.get('/stops/nearby?lat=-23.5&lng=-47.4');
    assert.deepEqual(fake.mock.calls[0].arguments, [-23.5, -47.4, 2500, 8]);
  });

  test('repassa radius e limit informados', async t => {
    const fake = t.mock.method(nearbyStops, 'findNearbyStops', () => [{ name: 'A' }]);
    const { body } = await json(api.get('/stops/nearby?lat=1&lng=2&radius=500&limit=3'));
    assert.deepEqual(fake.mock.calls[0].arguments, [1, 2, 500, 3]);
    assert.equal(body.count, 1);
  });
});

describe('GET /api/lines/paired', () => {
  test('400 sem routeCode ou cityId', async () => {
    assert.equal((await api.get('/lines/paired?routeCode=80')).status, 400);
  });

  test('retorna todas as variações do mesmo routeCode', async t => {
    t.mock.method(cittaProvider, 'getLines', async () => LINES);
    const { body } = await json(api.get('/lines/paired?routeCode=%2080%20&cityId=35'));
    assert.equal(body.count, 2);
    assert.ok(body.data.every(l => l.routeCode === '80'));
  });
});

describe('/api/crowding', () => {
  test('400 sem vehicleId ou level', async () => {
    assert.equal((await api.post('/crowding/report', { vehicleId: 'x' })).status, 400);
  });

  test('registra reporte e consulta nível consolidado', async () => {
    const report = await json(api.post('/crowding/report', { vehicleId: 7001, level: 'high' }));
    assert.equal(report.status, 200);
    assert.equal(report.body.data.level, 'high');
    assert.equal(report.body.data.votesCount, 1);

    const { body } = await json(api.get('/crowding/7001'));
    assert.equal(body.data.level, 'high');
  });

  test('veículo sem reportes retorna unknown', async () => {
    const { body } = await json(api.get('/crowding/nao-existe'));
    assert.equal(body.data.level, 'unknown');
  });
});
