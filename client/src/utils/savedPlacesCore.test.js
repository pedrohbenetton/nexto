import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeSavedPlaces,
  setSavedPlace,
  clearSavedPlace,
  canSavePlaceCandidate
} from './savedPlacesCore.js';

describe('savedPlacesCore', () => {
  test('sanitizeSavedPlaces filtra valores inválidos e devolve slots nulos por padrão', () => {
    assert.deepEqual(sanitizeSavedPlaces(null), { home: null, work: null });
    assert.deepEqual(sanitizeSavedPlaces({ home: { name: 'Rua A', lat: 0, lng: 0 }, work: 'invalido' }), {
      home: null,
      work: null
    });
  });

  test('setSavedPlace e clearSavedPlace são imutáveis e validam coordenadas', () => {
    const initial = sanitizeSavedPlaces(null);
    const home = { name: 'Rua das Flores, Centro', lat: -23.501, lng: -47.452 };
    const next = setSavedPlace(initial, 'home', home);

    assert.equal(initial.home, null);
    assert.deepEqual(next.home, home);
    assert.equal(next.work, null);

    // Slot desconhecido ou coordenada inválida não altera
    assert.deepEqual(setSavedPlace(next, 'gym', home), next);
    assert.deepEqual(setSavedPlace(next, 'work', { name: 'X', lat: 0, lng: 0 }), next);

    const cleared = clearSavedPlace(next, 'home');
    assert.equal(cleared.home, null);
  });

  test('canSavePlaceCandidate aceita endereços reais e rejeita "Minha localização"', () => {
    assert.equal(canSavePlaceCandidate({ name: 'Minha localização', lat: -23.5, lng: -47.4 }), false);
    assert.equal(canSavePlaceCandidate({ name: 'UFSCar Sorocaba', lat: -23.58, lng: -47.52 }), true);
    assert.equal(canSavePlaceCandidate(null), false);
  });
});
