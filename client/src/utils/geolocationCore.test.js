import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createLocator, GeoError } from './geolocationCore.js';

const COORDS = { coords: { latitude: -23.5, longitude: -47.45, accuracy: 12 } };
const EXPECTED = { lat: -23.5, lng: -47.45, accuracy: 12 };

function fakeNative({ check = 'granted', request = 'granted', position = COORDS, fail } = {}) {
  const calls = { request: 0, options: null };
  return {
    calls,
    checkPermissions: async () => ({ location: check }),
    requestPermissions: async () => { calls.request++; return { location: request }; },
    getCurrentPosition: async options => {
      calls.options = options;
      if (fail) throw fail;
      return position;
    }
  };
}

function fakeBrowser({ position = COORDS, error } = {}) {
  return {
    getCurrentPosition: (ok, ko) => (error ? ko(error) : ok(position))
  };
}

describe('createLocator — nativo (Capacitor)', () => {
  test('usa o plugin nativo sem pedir permissão já concedida', async () => {
    const native = fakeNative();
    const locate = createLocator({ isNative: true, native, browser: fakeBrowser({ error: { code: 2 } }) });
    assert.deepEqual(await locate({ timeout: 5000 }), EXPECTED);
    assert.equal(native.calls.request, 0);
    assert.deepEqual(native.calls.options, { timeout: 5000 });
  });

  test('pede permissão quando ainda não concedida', async () => {
    const native = fakeNative({ check: 'prompt' });
    const locate = createLocator({ isNative: true, native });
    assert.deepEqual(await locate(), EXPECTED);
    assert.equal(native.calls.request, 1);
  });

  test('rejeita com DENIED quando o usuário nega', async () => {
    const locate = createLocator({ isNative: true, native: fakeNative({ check: 'prompt', request: 'denied' }) });
    await assert.rejects(locate(), err => err instanceof GeoError && err.code === 'DENIED');
  });

  test('rejeita com UNAVAILABLE quando o GPS falha (ex.: localização desligada)', async () => {
    const locate = createLocator({ isNative: true, native: fakeNative({ fail: new Error('Location services are not enabled') }) });
    await assert.rejects(locate(), err => err.code === 'UNAVAILABLE');
  });
});

describe('createLocator — navegador', () => {
  test('converte a posição do navigator.geolocation', async () => {
    const locate = createLocator({ isNative: false, browser: fakeBrowser() });
    assert.deepEqual(await locate(), EXPECTED);
  });

  test('UNSUPPORTED sem API de geolocalização', async () => {
    const locate = createLocator({ isNative: false, browser: undefined });
    await assert.rejects(locate(), err => err.code === 'UNSUPPORTED');
  });

  test('código 1 vira DENIED e os demais UNAVAILABLE', async () => {
    const denied = createLocator({ isNative: false, browser: fakeBrowser({ error: { code: 1 } }) });
    await assert.rejects(denied(), err => err.code === 'DENIED');

    const timeout = createLocator({ isNative: false, browser: fakeBrowser({ error: { code: 3 } }) });
    await assert.rejects(timeout(), err => err.code === 'UNAVAILABLE');
  });
});
