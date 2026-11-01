import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusBarFor } from './nativeThemeCore.js';

test('tema claro: fundo do canvas claro e ícones escuros', () => {
  assert.deepEqual(statusBarFor(false), { style: 'LIGHT', backgroundColor: '#f6f7f2' });
});

test('tema escuro: fundo do canvas escuro e ícones claros', () => {
  assert.deepEqual(statusBarFor(true), { style: 'DARK', backgroundColor: '#0e1116' });
});
