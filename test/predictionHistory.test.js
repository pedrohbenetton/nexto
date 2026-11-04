const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { PredictionHistory } = require('../server/predictionHistory');

const MIN = 60 * 1000;
const veh = (vehicleId, secondsUntilArrival, isRealTime = true) => ({ vehicleId, secondsUntilArrival, isRealTime });

// Simula um ônibus previsto para chegar em `lead` s e que de fato chega em `lead + drift` s.
function simulateTrip(h, t, id, { lead = 600, drift = 0, svc = 's1', stop = 'p1', start = 0 } = {}) {
  t.mock.timers.setTime(start);
  h.record(svc, stop, [veh(id, lead)]);
  t.mock.timers.setTime(start + (lead + drift) * 1000 - 30 * 1000);
  h.record(svc, stop, [veh(id, 30)]);
  t.mock.timers.setTime(start + (lead + drift) * 1000 + 2 * MIN);
  h.record(svc, stop, []);
}

describe('PredictionHistory', () => {
  test('sem amostras devolve unknown', () => {
    const h = new PredictionHistory();
    const r = h.getReliability('s1', 'p1');
    assert.equal(r.level, 'unknown');
    assert.equal(r.samples, 0);
  });

  test('ignora veículos sem GPS (apenas horário programado)', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    h.record('s1', 'p1', [veh('a', 600, false)]);
    t.mock.timers.tick(20 * MIN);
    h.record('s1', 'p1', []);
    assert.equal(h.getReliability('s1', 'p1').samples, 0);
  });

  test('atraso constante vira "late" com mediana em minutos', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    for (let i = 0; i < 3; i++) simulateTrip(h, t, `v${i}`, { drift: 240, start: i * 60 * MIN });
    const r = h.getReliability('s1', 'p1');
    assert.equal(r.samples, 3);
    assert.equal(r.level, 'late');
    assert.equal(r.medianDriftMin, 4);
  });

  test('chegada adiantada vira "early"', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    for (let i = 0; i < 3; i++) simulateTrip(h, t, `v${i}`, { drift: -180, start: i * 60 * MIN });
    const r = h.getReliability('s1', 'p1');
    assert.equal(r.level, 'early');
    assert.equal(r.medianDriftMin, -3);
  });

  test('desvio pequeno é "on_time"', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    for (let i = 0; i < 3; i++) simulateTrip(h, t, `v${i}`, { drift: 30, start: i * 60 * MIN });
    assert.equal(h.getReliability('s1', 'p1').level, 'on_time');
  });

  test('menos de 3 amostras continua unknown', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    simulateTrip(h, t, 'v0', { drift: 600 });
    simulateTrip(h, t, 'v1', { drift: 600, start: 60 * MIN });
    const r = h.getReliability('s1', 'p1');
    assert.equal(r.samples, 2);
    assert.equal(r.level, 'unknown');
  });

  test('previsão com antecedência curta (<5 min) não gera amostra', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    simulateTrip(h, t, 'v0', { lead: 120, drift: 60 });
    assert.equal(h.getReliability('s1', 'p1').samples, 0);
  });

  test('filtra por hora do dia quando solicitado', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    const base = new Date(2026, 0, 5, 8, 0, 0).getTime();
    for (let i = 0; i < 3; i++) simulateTrip(h, t, `m${i}`, { drift: 300, start: base + i * 60 * MIN * 24 });
    const night = new Date(2026, 0, 5, 22, 0, 0).getTime();
    for (let i = 0; i < 3; i++) simulateTrip(h, t, `n${i}`, { drift: 0, start: night + i * 60 * MIN * 24 });
    assert.equal(h.getReliability('s1', 'p1', 8).level, 'late');
    assert.equal(h.getReliability('s1', 'p1', 22).level, 'on_time');
    assert.equal(h.getReliability('s1', 'p1').samples, 6);
  });

  test('ônibus fantasma: sumiu longe da parada sem chegar', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    h.record('s1', 'p1', [veh('ghost', 900)]);
    t.mock.timers.tick(MIN);
    h.record('s1', 'p1', []);
    assert.equal(h.getReliability('s1', 'p1').ghosts, 1);
    assert.equal(h.getReliability('s1', 'p1').samples, 0);
  });

  test('ônibus que desaparece perto da parada conta como chegada, não fantasma', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    simulateTrip(h, t, 'ok', { drift: 0 });
    assert.equal(h.getReliability('s1', 'p1').ghosts, 0);
    assert.equal(h.getReliability('s1', 'p1').samples, 1);
  });

  test('isolamento por linha+parada', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    simulateTrip(h, t, 'v0', { svc: 'sA' });
    assert.equal(h.getReliability('sB', 'p1').samples, 0);
    assert.equal(h.getReliability('sA', 'p1').samples, 1);
  });

  test('descarta amostras com mais de 7 dias', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const h = new PredictionHistory();
    simulateTrip(h, t, 'v0', { drift: 300 });
    t.mock.timers.setTime(8 * 24 * 60 * MIN);
    assert.equal(h.getReliability('s1', 'p1').samples, 0);
  });

  test('entradas inválidas não quebram', () => {
    const h = new PredictionHistory();
    h.record('', 'p1', [veh('a', 600)]);
    h.record('s1', 'p1', null);
    h.record('s1', 'p1', [{ isRealTime: true, secondsUntilArrival: 100 }]);
    assert.equal(h.getReliability('s1', 'p1').samples, 0);
  });
});
