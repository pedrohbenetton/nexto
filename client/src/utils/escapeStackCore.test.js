import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createEscapeStack } from './escapeStackCore.js';

describe('createEscapeStack', () => {
  test('aciona apenas o modal do topo (LIFO) em cada Escape e remove handlers desmontados', () => {
    const stack = createEscapeStack();
    const calls = [];

    assert.equal(stack.dispatch(), false);

    const removeDrawer = stack.push(() => calls.push('drawer'));
    const removeMap = stack.push(() => calls.push('map'));

    // Primeiro Escape fecha somente o MapView no topo, mantendo o Drawer aberto!
    assert.equal(stack.dispatch(), true);
    assert.deepEqual(calls, ['map']);

    // Quando o MapView desmonta, o próximo Escape fecha o Drawer
    removeMap();
    assert.equal(stack.dispatch(), true);
    assert.deepEqual(calls, ['map', 'drawer']);

    removeDrawer();
    assert.equal(stack.dispatch(), false);
  });
});
