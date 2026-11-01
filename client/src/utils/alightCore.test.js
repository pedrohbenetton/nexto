import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ALIGHT_THRESHOLDS, MAX_ACCURACY_M, distanceMeters, nextAlightState, formatDistance } from './alightCore.js';

describe('distanceMeters', () => {
  test('zero para o mesmo ponto', () => {
    assert.equal(distanceMeters({ lat: -23.5, lng: -47.45 }, { lat: -23.5, lng: -47.45 }), 0);
  });

  test('~111 m por milésimo de grau de latitude', () => {
    const d = distanceMeters({ lat: -23.5, lng: -47.45 }, { lat: -23.501, lng: -47.45 });
    assert.ok(Math.abs(d - 111) <= 1, `distância inesperada: ${d}`);
  });
});

describe('nextAlightState', () => {
  const fix = (distance, accuracy = 20) => ({ distance, accuracy });

  test('longe do ponto não avisa', () => {
    assert.deepEqual(nextAlightState('far', fix(2000)), { stage: 'far', notify: null });
  });

  test(`avisa "prepare-se" ao entrar em ${ALIGHT_THRESHOLDS.approaching} m`, () => {
    assert.deepEqual(nextAlightState('far', fix(ALIGHT_THRESHOLDS.approaching)), { stage: 'approaching', notify: 'approaching' });
  });

  test('não repete o aviso no mesmo estágio', () => {
    assert.deepEqual(nextAlightState('approaching', fix(300)), { stage: 'approaching', notify: null });
  });

  test(`avisa "desça agora" ao entrar em ${ALIGHT_THRESHOLDS.now} m`, () => {
    assert.deepEqual(nextAlightState('approaching', fix(120)), { stage: 'now', notify: 'now' });
  });

  test('salto direto para perto avisa só "desça agora"', () => {
    assert.deepEqual(nextAlightState('far', fix(80)), { stage: 'now', notify: 'now' });
  });

  test('não volta de estágio se o GPS oscilar para longe', () => {
    assert.deepEqual(nextAlightState('now', fix(400)), { stage: 'now', notify: null });
    assert.deepEqual(nextAlightState('approaching', fix(900)), { stage: 'approaching', notify: null });
  });

  test(`ignora leituras imprecisas (> ${MAX_ACCURACY_M} m)`, () => {
    assert.deepEqual(nextAlightState('far', fix(100, MAX_ACCURACY_M + 1)), { stage: 'far', notify: null });
  });
});

describe('formatDistance', () => {
  test('metros arredondados de 10 em 10 abaixo de 1 km', () => {
    assert.equal(formatDistance(4), '0 m');
    assert.equal(formatDistance(347), '350 m');
  });

  test('quilômetros com uma casa decimal e vírgula', () => {
    assert.equal(formatDistance(1000), '1,0 km');
    assert.equal(formatDistance(1260), '1,3 km');
  });
});
