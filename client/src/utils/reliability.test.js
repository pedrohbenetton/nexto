import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { reliabilityBadge } from './reliability.js';

const data = (level, medianDriftMin = null, samples = 5, ghosts = 0) => ({ level, medianDriftMin, samples, ghosts });

describe('reliabilityBadge', () => {
  test('null para dado ausente ou unknown', () => {
    assert.equal(reliabilityBadge(null), null);
    assert.equal(reliabilityBadge(undefined), null);
    assert.equal(reliabilityBadge(data('unknown', null, 1)), null);
  });

  test('atraso: texto com minutos e tom danger', () => {
    assert.deepEqual(reliabilityBadge(data('late', 4)), { text: 'Costuma atrasar 4 min', tone: 'danger' });
  });

  test('adiantado: usa valor absoluto e tom warn', () => {
    assert.deepEqual(reliabilityBadge(data('early', -3)), { text: 'Costuma adiantar 3 min', tone: 'warn' });
  });

  test('pontual: tom success', () => {
    assert.deepEqual(reliabilityBadge(data('on_time', 0)), { text: 'Costuma chegar no horário', tone: 'success' });
  });

  test('versão curta', () => {
    assert.equal(reliabilityBadge(data('late', 4), { short: true }).text, 'Atrasa ~4 min');
    assert.equal(reliabilityBadge(data('early', -3), { short: true }).text, 'Adianta ~3 min');
    assert.equal(reliabilityBadge(data('on_time', 0), { short: true }).text, 'Pontual');
  });

  test('nível desconhecido de versão futura é ignorado', () => {
    assert.equal(reliabilityBadge(data('bogus', 2)), null);
  });
});
