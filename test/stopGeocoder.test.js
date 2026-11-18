const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

const stopGeocoder = require('../server/stopGeocoder');

describe('extractCityHint', () => {
  test('identifica cidade pelo cityId ou pelo slug do lineRoutesPath', () => {
    assert.equal(stopGeocoder.extractCityHint('transporte_publico-Salvador-163305', 8).name, 'Salvador');
    assert.equal(stopGeocoder.extractCityHint('transporte_publico-SaoPaulo-SPTRANS-2708', 28).name, 'São Paulo');
    assert.equal(stopGeocoder.extractCityHint('transporte_publico-Recife-060', undefined).name, 'Recife');
    assert.equal(stopGeocoder.extractCityHint('sorocaba-80-ufscar', 35).name, 'Sorocaba');
  });
});

describe('resolveRouteWaypoints', () => {
  test('usa corredores curados de Sorocaba quando cityId=35', () => {
    const ufscarCentro = stopGeocoder.resolveRouteWaypoints('sorocaba-80-ufscar-centro', [], 35);
    const ufscarBairro = stopGeocoder.resolveRouteWaypoints('sorocaba-80-ufscar-bairro', [], 35);
    assert.notDeepEqual(ufscarCentro[0], ufscarBairro[0]);
    assert.deepEqual(ufscarCentro[0], ufscarBairro[ufscarBairro.length - 1]);

    assert.ok(stopGeocoder.resolveRouteWaypoints('sorocaba-e180-caranda', [], 35).length >= 5);
    assert.ok(stopGeocoder.resolveRouteWaypoints('sorocaba-65-campolim', [], 35).length >= 4);
    assert.ok(stopGeocoder.resolveRouteWaypoints('sorocaba-44-eden', [], 35).length >= 4);
    assert.ok(stopGeocoder.resolveRouteWaypoints('sorocaba-wanel', [], 35).length >= 3);
  });

  test('mapeia marcos dinâmicos das paradas em Sorocaba', () => {
    const stops = [
      { name: 'Terminal Santo Antônio' },
      { name: 'Av. Afonso Vergueiro, 500' },
      { name: 'Paço Municipal' }
    ];
    const wps = stopGeocoder.resolveRouteWaypoints('sorocaba-linha-qualquer', stops, 35);
    assert.equal(wps.length, 3);
    // Todos dentro de Sorocaba (~lat -23.48..-23.50)
    assert.ok(wps.every(([lat, lng]) => Math.abs(lat - (-23.49)) < 0.1 && Math.abs(lng - (-47.45)) < 0.1));
  });

  test('NUNCA projeta cidades fora de Sorocaba em coordenadas de Sorocaba, mesmo com vias homônimas', () => {
    // "Avenida Brasil" e "Independência" existem em SOROCABA_LANDMARKS, mas em Salvador (cityId=8) não podem ir para Sorocaba!
    const salvadorStops = [
      { name: 'Avenida Brasil, 100 - Salvador' },
      { name: 'Ladeira da Independência, 200 - Salvador' }
    ];
    const salvadorWps = stopGeocoder.resolveRouteWaypoints(
      'transporte_publico-Salvador-Consorcio-100',
      salvadorStops,
      8
    );
    assert.ok(salvadorWps.length >= 2);
    // Salvador fica em torno de lat -12.97, lng -38.50 (muito longe de Sorocaba -23.50, -47.45)
    for (const [lat, lng] of salvadorWps) {
      assert.ok(Math.abs(lat - (-12.98)) < 0.5, `lat inesperado para Salvador: ${lat}`);
      assert.ok(Math.abs(lng - (-38.50)) < 0.5, `lng inesperado para Salvador: ${lng}`);
    }

    const recifeWps = stopGeocoder.resolveRouteWaypoints('transporte_publico-Recife-060', [], 20);
    assert.ok(Math.abs(recifeWps[0][0] - (-8.06)) < 0.5);

    const spWps = stopGeocoder.resolveRouteWaypoints('transporte_publico-SaoPaulo-2708', [], 28);
    assert.ok(Math.abs(spWps[0][0] - (-23.55)) < 0.3 && Math.abs(spWps[0][1] - (-46.63)) < 0.3);
  });
});

describe('removeSpikesAndLoops & findClosestPolylinePoint', () => {
  test('removeSpikesAndLoops preserva polylines curtas e poda laços de retorno', () => {
    assert.deepEqual(stopGeocoder.removeSpikesAndLoops(null), []);
    assert.deepEqual(stopGeocoder.removeSpikesAndLoops([[1, 2], [3, 4]]), [[1, 2], [3, 4]]);

    const withLoop = [
      [-23.5000, -47.4500],
      [-23.5010, -47.4510], // início do desvio de retorno
      [-23.5030, -47.4530],
      [-23.5050, -47.4550],
      [-23.5030, -47.4530],
      [-23.5011, -47.4511], // retorna a < 0.0004 do índice 1 (j >= i + 4)
      [-23.5020, -47.4600]
    ];
    const cleaned = stopGeocoder.removeSpikesAndLoops(withLoop);
    assert.ok(cleaned.length < withLoop.length);
    assert.deepEqual(cleaned[0], [-23.5000, -47.4500]);
    assert.deepEqual(cleaned[cleaned.length - 1], [-23.5020, -47.4600]);
  });

  test('findClosestPolylinePoint respeita limites minIdx e maxIdx', () => {
    const poly = [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3]
    ];
    assert.deepEqual(stopGeocoder.findClosestPolylinePoint(1.1, 0.9, poly), [1, 1]);
    assert.deepEqual(stopGeocoder.findClosestPolylinePoint(0.1, 0.1, poly, 2, 3), [2, 2]);
  });
});

describe('mapStopsAlongRoadRoute', () => {
  test('geocodifica paradas-âncora de outras cidades via resolveStopCoord, descarta pontos fora da cidade e usa OSRM', async t => {
    t.mock.method(axios, 'get', async () => ({
      data: {
        routes: [{
          geometry: {
            coordinates: [
              [-38.4676, -12.8739],
              [-38.4850, -12.9400],
              [-38.5090, -13.0065]
            ]
          }
        }]
      }
    }));

    const stops = [
      { index: 0, stopId: 's1', name: 'R. do Curió, 92 - Periperi, Salvador - BA' },
      { index: 1, stopId: 's2', name: 'Ponto enganoso em outro estado' },
      { index: 2, stopId: 's3', name: 'Avenida Adhemar de Barros, 454 - Ondina, Salvador - BA' }
    ];

    const resolveStopCoord = async (query) => {
      if (query.includes('Curió')) return [-12.8739, -38.4676];
      if (query.includes('enganoso')) return [-23.5505, -46.6333]; // São Paulo -> deve ser descartado em Salvador!
      if (query.includes('Adhemar')) return [-13.0065, -38.5090];
      return null;
    };

    const res = await stopGeocoder.mapStopsAlongRoadRoute(
      stops,
      'transporte_publico-Salvador-Teste-Unique-1',
      8,
      { resolveStopCoord }
    );

    assert.equal(res.stops.length, 3);
    assert.deepEqual(res.stops[0].lat, -12.8739);
    assert.deepEqual(res.stops[2].lat, -13.0065);
    assert.ok(res.polyline.every(([lat]) => Math.abs(lat - (-12.94)) < 0.2));
  });

  test('usa interpolação suave de fallback quando OSRM falha e lida com 0 ou 1 parada', async t => {
    t.mock.method(console, 'warn', () => {});
    t.mock.method(axios, 'get', async () => { throw new Error('OSRM offline'); });

    const empty = await stopGeocoder.mapStopsAlongRoadRoute([], 'sorocaba-fallback-empty', 35);
    assert.deepEqual(empty.stops, []);
    assert.ok(empty.polyline.length > 2);

    const single = await stopGeocoder.mapStopsAlongRoadRoute(
      [{ index: 0, stopId: 'only', name: 'Ponto Único' }],
      'sorocaba-fallback-single',
      35
    );
    assert.equal(single.stops.length, 1);
    assert.ok(Number.isFinite(single.stops[0].lat) && Number.isFinite(single.stops[0].lng));
  });
});
