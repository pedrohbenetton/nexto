import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  putCachedLineDetails,
  buildStopSearchIndex,
  partitionScheduledDepartures
} from './offlineCatalogCore.js';

describe('offlineCatalogCore', () => {
  test('putCachedLineDetails guarda detalhes e respeita limite LRU descartando o mais antigo', () => {
    let store = {};
    store = putCachedLineDetails(store, 'p-1', { serviceId: '1', stops: [] }, { now: 100, maxEntries: 2 });
    store = putCachedLineDetails(store, 'p-2', { serviceId: '2', stops: [] }, { now: 200, maxEntries: 2 });
    store = putCachedLineDetails(store, 'p-3', { serviceId: '3', stops: [] }, { now: 300, maxEntries: 2 });

    assert.deepEqual(Object.keys(store).sort(), ['p-2', 'p-3']);
    assert.equal(store['p-3'].details.serviceId, '3');
  });

  test('buildStopSearchIndex indexa nomes de paradas sem acento a partir de detalhes e pontos salvos', () => {
    const detailsStore = {
      'p-80': {
        at: 100,
        details: {
          stops: [
            { name: 'Av. Pres. Juscelino Kubitscheck, 500' },
            { name: 'Av. Dr. Armando Pannunzio, 1700' }
          ]
        }
      }
    };
    const savedStops = [
      { line: { lineRoutesPath: 'p-65' }, stopName: 'Shopping Iguatemi Esplanada' }
    ];

    const idx = buildStopSearchIndex(detailsStore, savedStops);
    assert.ok(idx['p-80'].includes('armando pannunzio'));
    assert.ok(idx['p-65'].includes('shopping iguatemi'));
  });

  test('partitionScheduledDepartures destaca a próxima partida programada a partir do horário atual', () => {
    const departures = ['05:15', '12:30', '22:00', '22:25', '23:30'];
    const now = new Date(2026, 10, 17, 22, 10, 0); // 22:10

    const res = partitionScheduledDepartures(departures, now);
    assert.equal(res.nextDeparture, '22:25');
    assert.deepEqual(res.upcoming, ['22:25', '23:30']);
    assert.equal(res.all.length, 5);
  });

  test('partitionScheduledDepartures devolve null quando todas as partidas do dia já passaram', () => {
    const departures = ['06:00', '18:00'];
    const now = new Date(2026, 10, 17, 23, 45, 0);
    const res = partitionScheduledDepartures(departures, now);
    assert.equal(res.nextDeparture, null);
    assert.deepEqual(res.upcoming, []);
  });
});
