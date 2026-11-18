import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveCityLines,
  loadCityLines,
  saveLineDetails,
  loadLineDetails,
  loadAllLineDetails
} from './offlineCatalog.js';

function createMemoryStorage({ throwOnSet = false } = {}) {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (throwOnSet) throw new Error('QuotaExceededError');
      map.set(k, String(v));
    },
    clear: () => map.clear()
  };
}

beforeEach(() => {
  globalThis.localStorage = createMemoryStorage();
});

describe('offlineCatalog storage wrapper', () => {
  test('salva e restaura catálogo de linhas por cidade e ignora entradas vazias ou inválidas', () => {
    saveCityLines(35, []);
    assert.equal(loadCityLines(35), null);
    assert.equal(loadCityLines(null), null);

    const lines = [{ routeCode: '80', routeMnemonic: 'UFSCAR', lineRoutesPath: 'p-80' }];
    saveCityLines(35, lines);
    const loaded = loadCityLines(35);
    assert.ok(loaded && typeof loaded.at === 'number');
    assert.deepEqual(loaded.lines, lines);
  });

  test('salva e lê detalhes compactados de linhas e resiste a JSON corrompido ou quota esgotada', () => {
    assert.equal(loadLineDetails(''), null);
    assert.deepEqual(loadAllLineDetails(), {});

    saveLineDetails('p-80', {
      serviceId: 'srv-80',
      stops: [{ index: 0, stopId: 's0', name: 'Terminal São Paulo', departures: ['06:00'] }]
    });
    const d = loadLineDetails('p-80');
    assert.equal(d.serviceId, 'srv-80');
    assert.deepEqual(d.stops[0].departures, ['06:00']);

    globalThis.localStorage.setItem('nexto_line_details_v1', '{quebrado');
    assert.deepEqual(loadAllLineDetails(), {});

    globalThis.localStorage = createMemoryStorage({ throwOnSet: true });
    assert.doesNotThrow(() => {
      saveCityLines(35, [{ routeCode: '80' }]);
      const mem = saveLineDetails('p-80', { serviceId: 'srv-80', stops: [] });
      assert.ok(mem['p-80']);
    });
  });
});
