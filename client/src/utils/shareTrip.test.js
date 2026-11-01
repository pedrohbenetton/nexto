import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildShareUrl, parseShareParams, arrivalClock, buildShareMessage } from './shareTripCore.js';

const TRIP = { lineRoutesPath: 'sorocaba/linha 20', serviceId: 'srv20', stopId: 'st9', vehicleId: '1042', routeCode: '20' };

describe('buildShareUrl / parseShareParams', () => {
  test('gera um link que volta aos mesmos dados (ida e volta)', () => {
    const url = buildShareUrl('https://nexto.app/', TRIP);
    assert.ok(url.startsWith('https://nexto.app/?'));
    assert.deepEqual(parseShareParams(new URL(url).search), TRIP);
  });

  test('sem base pública não gera link', () => {
    assert.equal(buildShareUrl('', TRIP), null);
    assert.equal(buildShareUrl(undefined, TRIP), null);
  });

  test('omite campos opcionais ausentes', () => {
    const url = buildShareUrl('https://nexto.app', { lineRoutesPath: 'x', serviceId: 's' });
    assert.deepEqual(parseShareParams(new URL(url).search), { lineRoutesPath: 'x', serviceId: 's' });
  });

  test('URL sem linha não é um link de acompanhamento', () => {
    assert.equal(parseShareParams('?foo=1'), null);
    assert.equal(parseShareParams(''), null);
  });
});

describe('arrivalClock', () => {
  test('soma os segundos ao horário atual e formata HH:MM', () => {
    const now = new Date(2026, 10, 1, 18, 40, 10);
    assert.equal(arrivalClock(240, now), '18:44');
    assert.equal(arrivalClock(25 * 60, now), '19:05');
  });

  test('vira o dia corretamente', () => {
    assert.equal(arrivalClock(600, new Date(2026, 10, 1, 23, 55)), '00:05');
  });
});

describe('buildShareMessage', () => {
  const base = {
    line: { routeCode: '20', routeMnemonic: 'Vila Carol' },
    stopName: 'Rua Professor Carvalho Braga, 251',
    now: new Date(2026, 10, 1, 18, 40)
  };

  test('mensagem com horário estimado e link', () => {
    const msg = buildShareMessage({ ...base, seconds: 240, url: 'https://nexto.app/?linha=x' });
    assert.equal(msg, [
      '🚍 Ônibus 20 · Vila Carol',
      'Chega em Rua Professor Carvalho Braga, 251 por volta de 18:44 (em ~4 min).',
      'Acompanhe ao vivo: https://nexto.app/?linha=x'
    ].join('\n'));
  });

  test('ônibus chegando agora', () => {
    const msg = buildShareMessage({ ...base, seconds: 30, url: null });
    assert.equal(msg, '🚍 Ônibus 20 · Vila Carol\nEstá chegando em Rua Professor Carvalho Braga, 251 agora.');
  });

  test('sem nome de linha usa só o código', () => {
    const msg = buildShareMessage({ ...base, line: { routeCode: '20' }, seconds: 30 });
    assert.ok(msg.startsWith('🚍 Ônibus 20\n'));
  });
});
