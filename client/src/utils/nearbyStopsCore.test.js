import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNearbyStopsPath,
  formatDistance,
  stopSubtitle,
  lineDestinationLabel,
  resolveStopLineSelection
} from './nearbyStopsCore.js';

describe('nearbyStopsCore (client)', () => {
  test('buildNearbyStopsPath monta query com coordenadas, cityId, raio e limite', () => {
    const url = buildNearbyStopsPath({ lat: -23.5279, lng: -47.4914, cityId: 35, radius: 2500, limit: 10 });
    assert.equal(url, '/api/stops/nearby?lat=-23.5279&lng=-47.4914&cityId=35&radius=2500&limit=10');
  });

  test('formatDistance formata metros e quilômetros com vírgula', () => {
    assert.equal(formatDistance(85), '85 m');
    assert.equal(formatDistance(999), '999 m');
    assert.equal(formatDistance(1450), '1,5 km');
  });

  test('stopSubtitle extrai bairro/complemento sem repetir o nome da parada', () => {
    assert.equal(
      stopSubtitle({
        name: 'Av. Dr. Armando Pannunzio, 1700',
        address: 'Av. Dr. Armando Pannunzio, 1700 - Jardim Piazza Di Roma, Sorocaba - SP'
      }),
      'Jardim Piazza Di Roma, Sorocaba - SP'
    );
    assert.equal(
      stopSubtitle({ name: 'Terminal São Paulo', address: 'Terminal São Paulo' }),
      ''
    );
  });

  test('lineDestinationLabel escolhe destino legível e evita código redundante', () => {
    assert.equal(
      lineDestinationLabel({ routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: 'U F S C A R - Bairro' }),
      'U F S C A R - Bairro'
    );
    assert.equal(
      lineDestinationLabel({ routeCode: 'D210', routeMnemonic: 'Leste / Oeste', serviceMnemonic: 'D210 - LESTE / OESTE UNISO' }),
      'LESTE / OESTE UNISO'
    );
    assert.equal(
      lineDestinationLabel({ routeCode: '20', routeMnemonic: 'Vila Carol', serviceMnemonic: '' }),
      'Vila Carol'
    );
  });

  test('resolveStopLineSelection prioriza linha completa do catálogo e preserva stopId', () => {
    const catalog = [
      { id: 'cat-80', routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: 'Bairro', lineRoutesPath: 'p-80', bgColor: '#553399' }
    ];
    const stop = { stopId: 'stop-fallback', name: 'Av. Pannunzio, 1700' };
    const stopLine = { routeCode: '80', lineRoutesPath: 'p-80', stopId: 'stop-exact' };

    const sel = resolveStopLineSelection(stop, stopLine, catalog);
    assert.equal(sel.line.id, 'cat-80');
    assert.equal(sel.line.bgColor, '#553399');
    assert.equal(sel.stopId, 'stop-exact');

    const fallbackSel = resolveStopLineSelection(stop, { routeCode: '99', lineRoutesPath: 'p-99' }, catalog);
    assert.equal(fallbackSel.line.lineRoutesPath, 'p-99');
    assert.equal(fallbackSel.stopId, 'stop-fallback');
  });
});
