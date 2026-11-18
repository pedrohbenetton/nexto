import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildRadarBotUrl, formatLeadTimeLabel } from './radarCore.js';

describe('radarCore (Client) - buildRadarBotUrl', () => {
  test('gera link correto com parâmetros codificados', () => {
    const url = buildRadarBotUrl('NextoBot', 'srv-10', 'stop-20', 10);
    assert.equal(url, 'https://t.me/NextoBot?start=alert_srv-10_stop-20_10');
  });

  test('remove @ inicial e aplica defaults se campos ausentes', () => {
    const url = buildRadarBotUrl('@NextoTransitBot', 's', 'p');
    assert.equal(url, 'https://t.me/NextoTransitBot?start=alert_s_p_8');
  });

  test('limita os minutos entre 1 e 30', () => {
    assert.ok(buildRadarBotUrl('bot', 's', 'p', -5).endsWith('_1'));
    assert.ok(buildRadarBotUrl('bot', 's', 'p', 99).endsWith('_30'));
  });
});

describe('radarCore (Client) - formatLeadTimeLabel', () => {
  test('formata rótulos intuitivos', () => {
    assert.ok(formatLeadTimeLabel(1).includes('iminente'));
    assert.ok(formatLeadTimeLabel(3).includes('rápido'));
    assert.ok(formatLeadTimeLabel(8).includes('recomendado'));
    assert.ok(formatLeadTimeLabel(15).includes('com calma'));
  });
});
