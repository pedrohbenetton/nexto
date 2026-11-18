const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const spTransProvider = require('../server/providers/SPTransProvider');

describe('SPTransProvider - Instanciação e Busca de Cidades', () => {
  test('tem nome "SPTrans Olho Vivo"', () => {
    assert.equal(spTransProvider.name, 'SPTrans Olho Vivo');
  });

  test('searchCities localiza São Paulo pelo nome ou sigla', async () => {
    const byName = await spTransProvider.searchCities('são paulo');
    assert.equal(byName.length, 1);
    assert.equal(byName[0].cityId, 9001);

    const bySigla = await spTransProvider.searchCities('SP');
    assert.equal(bySigla.length, 1);
    assert.equal(bySigla[0].cityId, 9001);

    const empty = await spTransProvider.searchCities('Campinas');
    assert.equal(empty.length, 0);
  });
});

describe('SPTransProvider - Autenticação e Chamadas Olho Vivo', () => {
  test('authenticate retorna null quando não há token configurado', async () => {
    const originalToken = spTransProvider.token;
    spTransProvider.token = null;
    try {
      const res = await spTransProvider.authenticate();
      assert.equal(res, null);
    } finally {
      spTransProvider.token = originalToken;
    }
  });

  test('authenticate faz POST /Login/Autenticar e armazena o cookie apiCredentials', async t => {
    const originalToken = spTransProvider.token;
    spTransProvider.token = 'test-token-123';
    spTransProvider.sessionCookie = null;
    spTransProvider.cookieExpiresAt = 0;

    const mockPost = t.mock.method(axios, 'post', async () => ({
      status: 200,
      data: true,
      headers: {
        'set-cookie': ['apiCredentials=mock_credentials_hash_abc; Path=/; HttpOnly']
      }
    }));

    try {
      const cookie = await spTransProvider.authenticate();
      assert.equal(cookie, 'apiCredentials=mock_credentials_hash_abc');
      assert.equal(spTransProvider.sessionCookie, 'apiCredentials=mock_credentials_hash_abc');
      assert.equal(mockPost.mock.callCount(), 1);

      // Segunda chamada deve usar o cookie em cache sem novo POST
      const cachedCookie = await spTransProvider.authenticate();
      assert.equal(cachedCookie, 'apiCredentials=mock_credentials_hash_abc');
      assert.equal(mockPost.mock.callCount(), 1);
    } finally {
      spTransProvider.token = originalToken;
      spTransProvider.sessionCookie = null;
      spTransProvider.cookieExpiresAt = 0;
    }
  });

  test('fetchWithAuth renova a sessão automaticamente em caso de erro 401', async t => {
    const originalToken = spTransProvider.token;
    spTransProvider.token = 'test-token-123';
    spTransProvider.sessionCookie = 'apiCredentials=old_cookie';
    spTransProvider.cookieExpiresAt = Date.now() + 100000;

    let getCalls = 0;
    t.mock.method(axios, 'post', async () => ({
      status: 200,
      data: true,
      headers: { 'set-cookie': ['apiCredentials=new_refreshed_cookie'] }
    }));

    t.mock.method(axios, 'get', async (url, opts) => {
      getCalls++;
      if (getCalls === 1) {
        const err = new Error('Unauthorized');
        err.response = { status: 401 };
        throw err;
      }
      assert.equal(opts.headers.Cookie, 'apiCredentials=new_refreshed_cookie');
      return { data: [{ cl: 1273, lt: '8000', tl: 10, tp: 'LAPA', ts: 'RAMOS', sl: 1 }] };
    });

    try {
      const data = await spTransProvider.fetchWithAuth('/Linha/Buscar?termosBusca=8000');
      assert.equal(data.length, 1);
      assert.equal(getCalls, 2);
    } finally {
      spTransProvider.token = originalToken;
      spTransProvider.sessionCookie = null;
      spTransProvider.cookieExpiresAt = 0;
    }
  });
});

describe('SPTransProvider - Fallbacks e Dados Padrão', () => {
  test('getLines retorna linhas padrão quando offline ou sem token', async () => {
    const lines = await spTransProvider.getLines(9001);
    assert.ok(lines.length >= 2);
    assert.equal(lines[0].routeCode, '8000-10');
    assert.equal(lines[0].companyName, 'SPTrans Olho Vivo');
  });

  test('getLineDetails retorna paradas mesmo em fallback', async () => {
    const details = await spTransProvider.getLineDetails('gtfs-sp-cl-1273');
    assert.equal(details.agencyId, 'SPTrans');
    assert.ok(details.stops.length >= 4);
    assert.equal(details.stops[0].name, 'Terminal Lapa (Plataforma A)');
  });

  test('getLineTracking retorna telemetria com veículos rastreados', async () => {
    const tracking = await spTransProvider.getLineTracking('gtfs-sp-cl-1273', 'gtfs-sp-srv-1273', 9001);
    assert.equal(tracking.vehiclesCount, 2);
    assert.ok(tracking.vehicles[0].lat !== 0);
    assert.ok(tracking.polyline.length >= 4);
  });

  test('getStopPredictions retorna previsões padrão de teste', async () => {
    const predictions = await spTransProvider.getStopPredictions('gtfs-sp-srv-1273', 'stop_1');
    assert.equal(predictions.hasRealTime, true);
    assert.equal(predictions.activeVehicles, 1);
    assert.equal(predictions.vehicles[0].vehicleId, 'SP-8012');
  });
});
