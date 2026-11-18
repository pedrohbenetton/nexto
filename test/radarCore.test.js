const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseStartPayload,
  buildDeepLinkUrl,
  shouldTriggerAlert,
  formatTelegramMessage,
  formatAlertsListMessage
} = require('../server/radarCore');

describe('radarCore - parseStartPayload', () => {
  test('extrai serviceId, stopId e leadMinutes de payload válido', () => {
    const res = parseStartPayload('alert_srv123_stop456_10');
    assert.deepEqual(res, {
      serviceId: 'srv123',
      stopId: 'stop456',
      leadMinutes: 10
    });
  });

  test('remove comando /start inicial e assume default de 8 min quando ausente', () => {
    const res = parseStartPayload('/start alert_srvABC_stopDEF');
    assert.deepEqual(res, {
      serviceId: 'srvABC',
      stopId: 'stopDEF',
      leadMinutes: 8
    });
  });

  test('limita leadMinutes entre 1 e 30 minutos', () => {
    assert.equal(parseStartPayload('alert_s_st_0').leadMinutes, 1);
    assert.equal(parseStartPayload('alert_s_st_999').leadMinutes, 30);
  });

  test('retorna null para formatos inválidos ou nulos', () => {
    assert.equal(parseStartPayload(''), null);
    assert.equal(parseStartPayload('comando_aleatorio'), null);
    assert.equal(parseStartPayload(null), null);
    assert.equal(parseStartPayload('alert_'), null);
  });
});

describe('radarCore - buildDeepLinkUrl', () => {
  test('gera URL canônica com parâmetros codificados', () => {
    const url = buildDeepLinkUrl('NextoBot', 'srv-1', 'stop-1', 7);
    assert.equal(url, 'https://t.me/NextoBot?start=alert_srv-1_stop-1_7');
  });

  test('remove @ do username e usa default quando não informado', () => {
    const url = buildDeepLinkUrl('@MeuBot', 'srv', 'st');
    assert.equal(url, 'https://t.me/MeuBot?start=alert_srv_st_8');
  });
});

describe('radarCore - shouldTriggerAlert', () => {
  const baseSub = {
    active: true,
    leadMinutes: 8,
    lastNotifiedVehicleId: null,
    lastNotifiedAt: null,
    lastNotifiedMinutes: null
  };

  test('não dispara para inscrição inativa ou veículo inválido', () => {
    assert.equal(shouldTriggerAlert({ ...baseSub, active: false }, { minutesUntilArrival: 5 }), false);
    assert.equal(shouldTriggerAlert(baseSub, null), false);
    assert.equal(shouldTriggerAlert(baseSub, {}), false);
  });

  test('não dispara quando o ônibus está além da antecedência desejada', () => {
    assert.equal(shouldTriggerAlert(baseSub, { minutesUntilArrival: 12 }), false);
  });

  test('não dispara quando o ônibus já passou (negativo)', () => {
    assert.equal(shouldTriggerAlert(baseSub, { minutesUntilArrival: -2 }), false);
  });

  test('dispara quando está dentro do raio de antecedência', () => {
    assert.equal(shouldTriggerAlert(baseSub, { vehicleId: 'V1', minutesUntilArrival: 7 }), true);
  });

  test('evita spam para o mesmo veículo em curto intervalo', () => {
    const now = Date.now();
    const notifiedSub = {
      ...baseSub,
      lastNotifiedVehicleId: 'V1',
      lastNotifiedAt: new Date(now - 60000).toISOString(), // 1 min atrás
      lastNotifiedMinutes: 7
    };

    // 6 min agora, mesmo veículo -> não dispara
    assert.equal(shouldTriggerAlert(notifiedSub, { vehicleId: 'V1', minutesUntilArrival: 6 }, now), false);
  });

  test('dispara aviso urgente de confirmação quando ônibus entra em <= 2 min', () => {
    const now = Date.now();
    const notifiedSub = {
      ...baseSub,
      lastNotifiedVehicleId: 'V1',
      lastNotifiedAt: new Date(now - (3 * 60 * 1000)).toISOString(), // 3 min atrás
      lastNotifiedMinutes: 7
    };

    // Agora está a 2 minutos -> dispara confirmação urgente
    assert.equal(shouldTriggerAlert(notifiedSub, { vehicleId: 'V1', minutesUntilArrival: 2 }, now), true);
  });
});

describe('radarCore - formatTelegramMessage & formatAlertsListMessage', () => {
  test('formata mensagem de proximidade do Telegram com links', () => {
    const sub = {
      lineCode: '8000-10',
      lineDestination: 'Praça Ramos',
      stopName: 'Terminal Lapa',
      lineRoutesPath: 'gtfs-sp-cl-1273'
    };
    const vehicle = {
      vehicleId: '12345',
      licensePlate: 'ABC-1234',
      minutesUntilArrival: 5
    };

    const msg = formatTelegramMessage(sub, vehicle, 'https://nexto.app.br');
    assert.ok(msg.includes('8000-10'));
    assert.ok(msg.includes('Praça Ramos'));
    assert.ok(msg.includes('Terminal Lapa'));
    assert.ok(msg.includes('5 minutos'));
    assert.ok(msg.includes('https://nexto.app.br/?linha=gtfs-sp-cl-1273'));
  });

  test('formata lista de radares vazia e preenchida', () => {
    assert.ok(formatAlertsListMessage([]).includes('nenhum radar ativo'));

    const subs = [
      { id: 'sub_1', lineCode: '80', stopName: 'Centro', leadMinutes: 10 }
    ];
    const listMsg = formatAlertsListMessage(subs);
    assert.ok(listMsg.includes('Seus Radares Ativos'));
    assert.ok(listMsg.includes('80'));
    assert.ok(listMsg.includes('Centro'));
    assert.ok(listMsg.includes('/cancelar_sub_1'));
  });
});
