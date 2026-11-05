import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pinnedNotificationId, buildPinnedNotification } from './pinnedNotificationCore.js';

const entry = { serviceId: 's1', stopId: 'p9', stopName: 'Terminal Central', line: { routeCode: '101', routeMnemonic: 'Centro' } };

describe('pinnedNotification', () => {
  test('id é estável por ponto e cabe em inteiro de 32 bits positivo', () => {
    const a = pinnedNotificationId(entry);
    assert.equal(a, pinnedNotificationId({ ...entry }));
    assert.ok(Number.isInteger(a) && a > 0 && a < 2 ** 31);
    assert.notEqual(a, pinnedNotificationId({ ...entry, stopId: 'p10' }));
  });

  test('mostra a próxima chegada no título e as seguintes no corpo', () => {
    const n = buildPinnedNotification(entry, [{ label: '4 min', seconds: 240 }, { label: '15 min' }, { label: '28 min' }]);
    assert.equal(n.title, 'Linha 101 · 4 min');
    assert.match(n.body, /Terminal Central/);
    assert.match(n.body, /depois 15 min · 28 min/);
    assert.equal(n.ongoing, true);
    assert.equal(n.autoCancel, false);
  });

  test('"Agora" vira aviso de chegada', () => {
    const n = buildPinnedNotification(entry, [{ label: 'Agora', seconds: 20 }]);
    assert.equal(n.title, 'Linha 101 · chegando agora');
  });

  test('sem previsão informa que não há ônibus', () => {
    const n = buildPinnedNotification(entry, []);
    assert.equal(n.title, 'Linha 101 · sem ônibus previsto');
  });
});
