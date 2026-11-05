import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { putSnapshot, projectSnapshot, pruneSnapshots, SNAPSHOT_MAX_AGE_MS } from './offlineArrivals.js';

const arrivals = [
  { vehicleId: 'a', seconds: 300, label: '5 min', isRealTime: true },
  { vehicleId: 'b', seconds: 1200, label: '20 min', isRealTime: false }
];

describe('offlineArrivals', () => {
  test('putSnapshot guarda previsões com o instante e não muta o original', () => {
    const base = {};
    const next = putSnapshot(base, 's:1', arrivals, 1000);
    assert.deepEqual(base, {});
    assert.equal(next['s:1'].at, 1000);
    assert.equal(next['s:1'].arrivals.length, 2);
  });

  test('putSnapshot ignora lista vazia (não apaga o último retrato útil)', () => {
    const base = putSnapshot({}, 's:1', arrivals, 1000);
    assert.equal(putSnapshot(base, 's:1', [], 2000)['s:1'].at, 1000);
  });

  test('projectSnapshot desconta o tempo decorrido e recalcula o rótulo', () => {
    const snap = putSnapshot({}, 's:1', arrivals, 0)['s:1'];
    const p = projectSnapshot(snap, 120 * 1000);
    assert.equal(p.arrivals[0].seconds, 180);
    assert.equal(p.arrivals[0].label, '3 min');
    assert.equal(p.arrivals[0].isRealTime, false); // dado antigo nunca é "ao vivo"
    assert.equal(p.at, 0);
  });

  test('projectSnapshot descarta ônibus que já passaram', () => {
    const snap = putSnapshot({}, 's:1', arrivals, 0)['s:1'];
    const p = projectSnapshot(snap, 400 * 1000);
    assert.deepEqual(p.arrivals.map(a => a.vehicleId), ['b']);
  });

  test('projectSnapshot devolve null sem retrato ou com retrato velho demais', () => {
    assert.equal(projectSnapshot(undefined, 0), null);
    const snap = putSnapshot({}, 's:1', arrivals, 0)['s:1'];
    assert.equal(projectSnapshot(snap, SNAPSHOT_MAX_AGE_MS + 1), null);
  });

  test('pruneSnapshots remove chaves de pontos que não estão mais salvos', () => {
    let snaps = putSnapshot({}, 's:1', arrivals, 0);
    snaps = putSnapshot(snaps, 's:2', arrivals, 0);
    assert.deepEqual(Object.keys(pruneSnapshots(snaps, ['s:2'])), ['s:2']);
  });
});
