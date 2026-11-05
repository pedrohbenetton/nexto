import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  shortPlaceName, needsResolve, buildTripPath, formatDuration, formatClock,
  summarizeItinerary, describeLeg, itineraryPoints, resolveTripTime
} from './tripPlanCore.js';

describe('shortPlaceName', () => {
  test('mantém só rua e bairro, sem cidade/estado/CEP/país', () => {
    assert.equal(
      shortPlaceName('Avenida Armando Pannunzio, Jardim Europa, Sorocaba, São Paulo, 18043, BRA'),
      'Avenida Armando Pannunzio, Jardim Europa'
    );
  });
  test('nome curto permanece igual e valor vazio vira string vazia', () => {
    assert.equal(shortPlaceName('Terminal São Paulo'), 'Terminal São Paulo');
    assert.equal(shortPlaceName(undefined), '');
  });
});

describe('needsResolve', () => {
  test('autocomplete devolve lat/lng 0: precisa resolver', () => {
    assert.equal(needsResolve({ lat: 0, lng: 0 }), true);
    assert.equal(needsResolve({}), true);
  });
  test('com coordenadas reais não precisa', () => {
    assert.equal(needsResolve({ lat: -23.5, lng: -47.4 }), false);
  });
});

describe('buildTripPath', () => {
  const from = { lat: -23.58, lng: -47.52 };
  const to = { lat: -23.53, lng: -47.48 };
  test('monta a rota /api/trip com as coordenadas', () => {
    assert.equal(
      buildTripPath({ from, to }),
      '/api/trip?fromLat=-23.58&fromLng=-47.52&toLat=-23.53&toLng=-47.48'
    );
  });
  test('inclui horário e chegar-até quando informados', () => {
    const path = buildTripPath({ from, to, dateTime: 1000, arriveBy: true });
    assert.match(path, /&dateTime=1000/);
    assert.match(path, /&arriveBy=1/);
  });
});

describe('formatDuration', () => {
  test('minutos e horas', () => {
    assert.equal(formatDuration(0), '0 min');
    assert.equal(formatDuration(20), '20 min');
    assert.equal(formatDuration(60), '1 h');
    assert.equal(formatDuration(75), '1 h 15 min');
  });
});

describe('formatClock', () => {
  test('HH:MM ou traço quando inválido', () => {
    assert.match(formatClock('2026-11-05T17:36:00.000Z'), /^\d{2}:\d{2}$/);
    assert.equal(formatClock(null), '—');
  });
});

describe('summarizeItinerary', () => {
  const walk = { isWalk: true, durationMin: 6 };
  const bus = code => ({ isWalk: false, lineCode: code, durationMin: 12 });

  test('trajeto direto', () => {
    const s = summarizeItinerary({ legs: [walk, bus('80'), { isWalk: true, durationMin: 1 }], transfers: 0 });
    assert.deepEqual(s, { lines: ['80'], walkMin: 7, transfersLabel: 'Direto' });
  });
  test('com baldeações (singular e plural)', () => {
    const one = summarizeItinerary({ legs: [bus('80'), bus('44')], transfers: 1 });
    assert.equal(one.transfersLabel, '1 baldeação');
    assert.deepEqual(one.lines, ['80', '44']);
    assert.equal(summarizeItinerary({ legs: [], transfers: 2 }).transfersLabel, '2 baldeações');
  });
});

describe('describeLeg', () => {
  test('caminhada', () => {
    assert.equal(describeLeg({ isWalk: true, durationMin: 6, distanceM: 533 }), 'Caminhe 6 min (533 m)');
  });
  test('caminhada longa em km', () => {
    assert.equal(describeLeg({ isWalk: true, durationMin: 20, distanceM: 1500 }), 'Caminhe 20 min (1,5 km)');
  });
  test('ônibus', () => {
    assert.equal(
      describeLeg({ isWalk: false, lineCode: '80', headsign: 'U F S C A R - Centro', durationMin: 12, from: { name: 'Rod. João Leme' } }),
      'Linha 80 sentido U F S C A R - Centro · 12 min'
    );
  });
});

describe('itineraryPoints', () => {
  test('junta os pontos de todas as pernas', () => {
    const pts = itineraryPoints({ legs: [{ path: [[1, 2], [3, 4]] }, { path: [[5, 6]] }, {}] });
    assert.deepEqual(pts, [[1, 2], [3, 4], [5, 6]]);
  });
});

describe('resolveTripTime', () => {
  const now = new Date(2026, 10, 5, 14, 30).getTime();

  test('"now" não envia dateTime nem arriveBy', () => {
    assert.deepEqual(resolveTripTime({ mode: 'now', clock: '', now }), { dateTime: undefined, arriveBy: false });
  });

  test('hoje, quando o horário ainda não passou', () => {
    const r = resolveTripTime({ mode: 'depart', clock: '18:00', now });
    assert.equal(r.dateTime, new Date(2026, 10, 5, 18, 0).getTime());
    assert.equal(r.arriveBy, false);
  });

  test('amanhã, quando o horário já passou', () => {
    const r = resolveTripTime({ mode: 'arrive', clock: '08:15', now });
    assert.equal(r.dateTime, new Date(2026, 10, 6, 8, 15).getTime());
    assert.equal(r.arriveBy, true);
  });

  test('horário inválido cai em "agora"', () => {
    assert.deepEqual(resolveTripTime({ mode: 'depart', clock: '99:99', now }), { dateTime: undefined, arriveBy: false });
    assert.deepEqual(resolveTripTime({ mode: 'depart', clock: '', now }), { dateTime: undefined, arriveBy: false });
  });
});
