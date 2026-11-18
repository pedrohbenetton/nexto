const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseOlhoVivoLine,
  extractClFromPath,
  parseOlhoVivoStops,
  timeToMinutes,
  calculateOlhoVivoEta,
  parseOlhoVivoPositions,
  parseOlhoVivoPredictions
} = require('../server/providers/spTransCore');

describe('spTransCore - parseOlhoVivoLine', () => {
  test('converte linha sentido 1 (Principal -> Secundário) corretamente', () => {
    const raw = {
      cl: 1273,
      lc: false,
      lt: '8000',
      sl: 1,
      tl: 10,
      tp: 'TERMINAL LAPA',
      ts: 'PRAÇA RAMOS DE AZEVEDO'
    };

    const parsed = parseOlhoVivoLine(raw);
    assert.equal(parsed.id, 'gtfs_sp_1273');
    assert.equal(parsed.routeCode, '8000-10');
    assert.equal(parsed.routeMnemonic, 'TERMINAL LAPA');
    assert.equal(parsed.serviceMnemonic, 'PRAÇA RAMOS DE AZEVEDO');
    assert.equal(parsed.lineRoutesPath, 'gtfs-sp-cl-1273');
    assert.deepEqual(parsed.tags, ['SPTrans', 'Olho Vivo', 'Oficial']);
    assert.equal(parsed.companyName, 'SPTrans Olho Vivo');
  });

  test('converte linha sentido 2 invertendo origem/destino e inclui tag CIRCULAR quando lc=true', () => {
    const raw = {
      cl: 1274,
      lc: true,
      lt: '8000',
      sl: 2,
      tl: 10,
      tp: 'TERMINAL LAPA',
      ts: 'PRAÇA RAMOS DE AZEVEDO'
    };

    const parsed = parseOlhoVivoLine(raw);
    assert.equal(parsed.routeMnemonic, 'PRAÇA RAMOS DE AZEVEDO');
    assert.equal(parsed.serviceMnemonic, 'TERMINAL LAPA');
    assert.ok(parsed.tags.includes('CIRCULAR'));
  });

  test('retorna apenas lt quando tl não existe ou é 0', () => {
    assert.equal(parseOlhoVivoLine({ cl: 1, lt: '200', tl: 0 }).routeCode, '200');
    assert.equal(parseOlhoVivoLine({ cl: 2, lt: '300' }).routeCode, '300');
  });

  test('retorna null para entrada inválida', () => {
    assert.equal(parseOlhoVivoLine(null), null);
    assert.equal(parseOlhoVivoLine('string'), null);
  });
});

describe('spTransCore - extractClFromPath', () => {
  test('extrai cl de caminhos válidos', () => {
    assert.equal(extractClFromPath('gtfs-sp-cl-1273'), 1273);
    assert.equal(extractClFromPath('gtfs-sp-srv-456'), 456);
    assert.equal(extractClFromPath('gtfs-sp-999'), 999);
  });

  test('retorna null para formatos não compatíveis', () => {
    assert.equal(extractClFromPath('gtfs-sp-8000-10-lapa-ramos'), null);
    assert.equal(extractClFromPath('sorocaba/linha-80'), null);
    assert.equal(extractClFromPath(null), null);
    assert.equal(extractClFromPath(''), null);
  });
});

describe('spTransCore - parseOlhoVivoStops', () => {
  test('converte lista de paradas da SPTrans em formato Nexto', () => {
    const rawStops = [
      { cp: 340015339, np: 'TERMINAL LAPA', ed: 'PC GIOVANNI BOTTESINI', py: -23.5188, px: -46.7022 },
      { cp: 340015340, np: 'RUA CLÉLIA, 800', ed: 'R CLÉLIA', py: -23.5245, px: -46.6853 }
    ];

    const stops = parseOlhoVivoStops(rawStops);
    assert.equal(stops.length, 2);
    assert.deepEqual(stops[0], {
      index: 0,
      stopId: '340015339',
      name: 'TERMINAL LAPA',
      address: 'PC GIOVANNI BOTTESINI',
      lat: -23.5188,
      lng: -46.7022
    });
  });

  test('retorna array vazio para entradas não-array', () => {
    assert.deepEqual(parseOlhoVivoStops(null), []);
    assert.deepEqual(parseOlhoVivoStops(undefined), []);
    assert.deepEqual(parseOlhoVivoStops({}), []);
  });
});

describe('spTransCore - timeToMinutes & calculateOlhoVivoEta', () => {
  test('converte timeToMinutes corretamente', () => {
    assert.equal(timeToMinutes('00:00'), 0);
    assert.equal(timeToMinutes('01:30'), 90);
    assert.equal(timeToMinutes('16:45'), 1005);
    assert.equal(timeToMinutes('23:59'), 1439);
    assert.equal(timeToMinutes('invalido'), null);
    assert.equal(timeToMinutes(null), null);
  });

  test('calcula ETA no mesmo período', () => {
    const eta = calculateOlhoVivoEta('16:52', '16:45');
    assert.deepEqual(eta, { minutes: 7, seconds: 420 });
  });

  test('calcula ETA com virada de meia-noite (23:55 para 00:05)', () => {
    const eta = calculateOlhoVivoEta('00:05', '23:55');
    assert.deepEqual(eta, { minutes: 10, seconds: 600 });
  });

  test('diferença pequena negativa (-1 a -4 min) vira 0 min ("Agora")', () => {
    const eta = calculateOlhoVivoEta('16:44', '16:45');
    assert.deepEqual(eta, { minutes: 0, seconds: 0 });
  });

  test('ônibus atrasado há mais de 5 minutos é descartado (null)', () => {
    const eta = calculateOlhoVivoEta('16:30', '16:45');
    assert.equal(eta, null);
  });
});

describe('spTransCore - parseOlhoVivoPositions', () => {
  test('converte posições de veículos em tempo real', () => {
    const raw = {
      hr: '16:45',
      vs: [
        { p: 12345, a: true, ta: '2026-11-18T16:45:00Z', py: -23.5231, px: -46.6890 },
        { p: 12346, a: false, ta: '2026-11-18T16:44:50Z', py: -23.5350, px: -46.6550 }
      ]
    };

    const res = parseOlhoVivoPositions(raw);
    assert.equal(res.referenceTime, '16:45');
    assert.equal(res.vehicles.length, 2);
    assert.equal(res.vehicles[0].vehicleId, 'SP-12345');
    assert.equal(res.vehicles[0].licensePlate, '12345');
    assert.equal(res.vehicles[0].accessible, true);
    assert.equal(res.vehicles[0].lat, -23.5231);
    assert.equal(res.vehicles[0].lng, -46.6890);
    assert.equal(res.vehicles[1].accessible, false);
  });

  test('retorna lista vazia para entrada vazia', () => {
    assert.deepEqual(parseOlhoVivoPositions(null), { vehicles: [], referenceTime: '' });
  });
});

describe('spTransCore - parseOlhoVivoPredictions', () => {
  test('transforma resposta de /Previsao no modelo padrão Nexto', () => {
    const raw = {
      hr: '16:45',
      p: {
        cp: 340015339,
        np: 'TERMINAL LAPA',
        py: -23.5188,
        px: -46.7022,
        l: [
          {
            cl: 1273,
            c: '8000-10',
            sl: 1,
            lt0: 'TERMINAL LAPA',
            lt1: 'PRAÇA RAMOS DE AZEVEDO',
            qv: 2,
            vs: [
              { p: 99999, t: '16:57', a: true, py: -23.53, px: -46.67 },
              { p: 12345, t: '16:48', a: true, py: -23.52, px: -46.68 }
            ]
          }
        ]
      }
    };

    const predictions = parseOlhoVivoPredictions(raw, 1273);
    assert.equal(predictions.routeCode, '8000-10');
    assert.equal(predictions.routeMnemonic, 'TERMINAL LAPA');
    assert.equal(predictions.serviceMnemonic, 'PRAÇA RAMOS DE AZEVEDO');
    assert.equal(predictions.stopId, '340015339');
    assert.equal(predictions.activeVehicles, 2);
    assert.equal(predictions.hasRealTime, true);
    // Ordenado pelo mais próximo (16:48 antes de 16:57)
    assert.equal(predictions.vehicles[0].vehicleId, 'SP-12345');
    assert.equal(predictions.vehicles[0].minutesUntilArrival, 3);
    assert.equal(predictions.vehicles[1].vehicleId, 'SP-99999');
    assert.equal(predictions.vehicles[1].minutesUntilArrival, 12);
  });

  test('retorna fallback consistente quando não há previsões', () => {
    const predictions = parseOlhoVivoPredictions(null, 1273);
    assert.equal(predictions.hasRealTime, false);
    assert.equal(predictions.vehicles.length, 0);
  });
});
