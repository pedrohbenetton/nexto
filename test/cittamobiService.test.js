const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

const cache = require('../server/cache');
const stopGeocoder = require('../server/stopGeocoder');
const citta = require('../server/cittamobiService');

beforeEach(() => {
  cache.clear();
});

describe('cleanStopAddress', () => {
  test('remove tags HTML e prefixo numérico operacional', () => {
    const res = citta.cleanStopAddress('<b>0169 - Av. Afonso Vergueiro, 800</b>', 'sorocaba-44', 2, 10);
    assert.equal(res, 'Av. Afonso Vergueiro, 800');
  });

  test('normaliza paradas sem nome (Unnamed Road / vazio / genérico) conforme posição e linha', () => {
    assert.equal(
      citta.cleanStopAddress('Unnamed Road', 'transporte_publico-Sorocaba-80-UFSCAR', 0, 20),
      'UFSCar - Campus Sorocaba (Terminal Universitário)'
    );
    assert.equal(
      citta.cleanStopAddress('', 'transporte_publico-Sorocaba-44-Eden', 0, 15),
      'Terminal / Estação de Origem'
    );
    assert.equal(
      citta.cleanStopAddress('Sorocaba - SP, Brasil', 'transporte_publico-Sorocaba-44-Eden', 14, 15),
      'Terminal / Estação de Destino'
    );
    assert.equal(
      citta.cleanStopAddress('Rua sem nome', 'transporte_publico-Sorocaba-44-Eden', 4, 15),
      'Parada de Embarque #5'
    );
    assert.equal(
      citta.cleanStopAddress(null, null, 2, 0),
      'Parada de Embarque #3'
    );
  });

  test('padroniza numerações específicas da SP-079, abreviações, CEP e sufixos redundantes', () => {
    assert.equal(
      citta.cleanStopAddress('SP-079, 1970, 18052-000, São Paulo, Brasil', 'sorocaba', 1, 10),
      'Av. Dr. Armando Pannunzio, 1970'
    );
    assert.equal(
      citta.cleanStopAddress('SP-079, 2171', 'sorocaba', 1, 10),
      'Av. General Carneiro, 2171'
    );
    assert.equal(
      citta.cleanStopAddress('SP-079, km 102', 'sorocaba', 1, 10),
      'Rod. João Leme dos Santos (SP-079), km 102'
    );
    assert.equal(
      citta.cleanStopAddress('Av. Gen. Osório,, nº 120, sn', 'sorocaba', 1, 10),
      'Av. General Osório, 120 (s/n)'
    );
    assert.equal(
      citta.cleanStopAddress('Av. Pres. Kennedy, 50, Brasil', 'sorocaba', 1, 10),
      'Av. Presidente Kennedy, 50'
    );
  });
});

describe('parseLineDetailsHtml', () => {
  test('extrai serviceId, agencyId, paradas e cronograma id="line-departures-v1" mesmo sem chave "0"', () => {
    const html = `
      <html>
        <body>
          <input type="hidden" id="serviceId" value="srv-uuid-123" />
          <input type="hidden" id="agencyId" value="ag-456" />
          <div class="stop-card" data-stop-id="st-0">
            <div><p class="stop-name">Terminal São Paulo</p></div></div></div>
          <div class="stop-card" data-stop-id="st-1">
            <div><span class="stop-address">0123 - Av. Gal. Carneiro, 500</span></div></div></div>
          <div class="stop-card" data-stop-id="st-2">
            <div>Rua Sete de Setembro, 40 -- Centro</div></div></div>
          <script type="application/json" id="line-departures-v1">
            {"1":["06:10","07:10"],"2":["06:25"]}
          </script>
        </body>
      </html>
    `;

    const details = citta.parseLineDetailsHtml(html, 'transporte_publico-Sorocaba-80');
    assert.equal(details.lineRoutesPath, 'transporte_publico-Sorocaba-80');
    assert.equal(details.serviceId, 'srv-uuid-123');
    assert.equal(details.agencyId, 'ag-456');
    assert.equal(details.stopsCount, 3);
    assert.deepEqual(details.stops[0].departures, []);
    assert.deepEqual(details.stops[1].departures, ['06:10', '07:10']);
    assert.equal(details.stops[1].name, 'Av. General Carneiro, 500');
    assert.equal(details.stops[2].name, 'Rua Sete de Setembro, 40');
    assert.deepEqual(details.stops[2].departures, ['06:25']);
  });

  test('suporta formato legado de script JSON sem id e tolera JSON malformado ou HTML vazio', () => {
    const legacyHtml = `
      <input id="serviceId" value="srv-1" />
      <div data-stop-id="s0"><div><p class="stop-name">Ponto A</p></div></div></div>
      <script>{"0":["05:00","05:30"]}</script>
    `;
    const parsed = citta.parseLineDetailsHtml(legacyHtml, 'linha-legada');
    assert.deepEqual(parsed.stops[0].departures, ['05:00', '05:30']);

    const brokenHtml = `<script id="line-departures-v1">{invalido}</script>`;
    const empty = citta.parseLineDetailsHtml(brokenHtml, 'linha-vazia');
    assert.equal(empty.serviceId, null);
    assert.equal(empty.stopsCount, 0);
    assert.deepEqual(empty.stops, []);
  });
});

describe('getLineTracking', () => {
  test('filtra veículos teóricos (isRealTime=false), preserva GPS nativo e projeta demais sobre a polyline', async t => {
    // Mock de HTML de getLineDetails via axios.get
    t.mock.method(axios, 'get', async () => ({
      data: Buffer.from(`
        <input id="serviceId" value="srv-track-1" />
        <div data-stop-id="s0"><div><p class="stop-name">Terminal São Paulo</p></div></div></div>
        <div data-stop-id="s1"><div><p class="stop-name">Av. Moreira César</p></div></div></div>
        <div data-stop-id="s2"><div><p class="stop-name">UFSCar</p></div></div></div>
      `)
    }));

    t.mock.method(stopGeocoder, 'mapStopsAlongRoadRoute', async (stops) => ({
      stops: [
        { ...stops[0], lat: -23.505, lng: -47.452 },
        { ...stops[1], lat: -23.515, lng: -47.472 },
        { ...stops[2], lat: -23.525, lng: -47.492 }
      ],
      polyline: [
        [-23.505, -47.452],
        [-23.510, -47.462],
        [-23.515, -47.472],
        [-23.520, -47.482],
        [-23.525, -47.492]
      ]
    }));

    // Pré-popula o cache de previsões por parada (usado por getStopPredictions)
    cache.set('pred:srv-track-1:s0', {
      vehicles: [
        // Veículo teórico sem telemetria ativa -> deve ser ignorado!
        { vehicleId: 'ghost-1', isRealTime: false, secondsUntilArrival: 120 }
      ]
    }, 60_000);
    cache.set('pred:srv-track-1:s1', {
      vehicles: [
        // Veículo real com GPS nativo transmitido
        {
          vehicleId: 'gps-bus',
          licensePlate: 'ABC-1234',
          isRealTime: true,
          secondsUntilArrival: 45,
          minutesUntilArrival: 0,
          currentLat: -23.512345,
          currentLng: -47.46789
        },
        // Mesmo veículo projetado visto mais distante em s2 (deve manter o menor secondsUntilArrival = s1)
        {
          vehicleId: 'proj-bus',
          licensePlate: '',
          isRealTime: true,
          secondsUntilArrival: 180,
          minutesUntilArrival: 3,
          currentLat: 0,
          currentLng: 0
        }
      ]
    }, 60_000);
    cache.set('pred:srv-track-1:s2', {
      vehicles: [
        {
          vehicleId: 'proj-bus',
          licensePlate: '',
          isRealTime: true,
          secondsUntilArrival: 600,
          minutesUntilArrival: 10,
          currentLat: 0,
          currentLng: 0
        }
      ]
    }, 60_000);

    const tracking = await citta.getLineTracking('sorocaba-80-ufscar', undefined, 35);
    assert.equal(tracking.serviceId, 'srv-track-1');
    assert.equal(tracking.vehiclesCount, 2);

    const byId = Object.fromEntries(tracking.vehicles.map(v => [v.vehicleId, v]));
    assert.equal(byId['ghost-1'], undefined);

    assert.equal(byId['gps-bus'].lat, -23.512345);
    assert.equal(byId['gps-bus'].lng, -47.46789);
    assert.equal(byId['gps-bus'].status, 'APPROACHING');

    assert.equal(byId['proj-bus'].licensePlate, 'PR-proj-bus');
    assert.equal(byId['proj-bus'].status, 'IN_TRANSIT');
    assert.equal(byId['proj-bus'].nextStopIndex, 1);
    assert.ok(Number.isFinite(byId['proj-bus'].lat) && Number.isFinite(byId['proj-bus'].lng));
  });
});

describe('fetchWithRetry', () => {
  test('repete uma vez em falha transitória de rede/timeout e falha rápido em erro HTTP com response', async () => {
    let attempts = 0;
    const res = await citta.fetchWithRetry(async () => {
      attempts++;
      if (attempts === 1) {
        const err = new Error('timeout of 6500ms exceeded');
        err.code = 'ECONNABORTED';
        throw err;
      }
      return 'ok-na-segunda';
    });
    assert.equal(res, 'ok-na-segunda');
    assert.equal(attempts, 2);

    let httpAttempts = 0;
    await assert.rejects(
      citta.fetchWithRetry(async () => {
        httpAttempts++;
        const err = new Error('Request failed with status code 404');
        err.response = { status: 404 };
        throw err;
      }),
      { message: /404/ }
    );
    assert.equal(httpAttempts, 1);
  });
});
