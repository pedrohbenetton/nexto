import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildApiUrl } from './api.js';

describe('buildApiUrl', () => {
  test('sem base mantém o caminho relativo (web servida pelo próprio BFF)', () => {
    assert.equal(buildApiUrl('', '/api/health'), '/api/health');
    assert.equal(buildApiUrl(undefined, '/api/health'), '/api/health');
  });

  test('prefixa a base informada (app nativo)', () => {
    assert.equal(buildApiUrl('http://192.168.0.10:3001', '/api/health'), 'http://192.168.0.10:3001/api/health');
  });

  test('normaliza barras duplicadas ou ausentes', () => {
    assert.equal(buildApiUrl('https://api.nexto.app/', '/api/x'), 'https://api.nexto.app/api/x');
    assert.equal(buildApiUrl('https://api.nexto.app//', 'api/x'), 'https://api.nexto.app/api/x');
  });

  test('ignora espaços na base vinda do .env', () => {
    assert.equal(buildApiUrl('  https://api.nexto.app  ', '/api/x'), 'https://api.nexto.app/api/x');
  });
});
