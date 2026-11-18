const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const radarAlerts = require('../server/radarAlerts');
const providerRegistry = require('../server/providers/ProviderRegistry');

describe('RadarAlertsService - Subscrições e Gerenciamento', () => {
  beforeEach(() => {
    radarAlerts.subscriptions.clear();
  });

  test('subscribe cria inscrição com ID único e valores padrão', () => {
    const sub = radarAlerts.subscribe({
      chatId: '123456',
      serviceId: 'srv-teste',
      stopId: 'stop-1',
      stopName: 'Ponto Central',
      lineCode: '80',
      leadMinutes: 10
    });

    assert.ok(sub.id.startsWith('sub_'));
    assert.equal(sub.chatId, '123456');
    assert.equal(sub.serviceId, 'srv-teste');
    assert.equal(sub.stopId, 'stop-1');
    assert.equal(sub.leadMinutes, 10);
    assert.equal(sub.active, true);
  });

  test('subscribe atualiza inscrição existente com mesmo chatId, serviceId e stopId', () => {
    const sub1 = radarAlerts.subscribe({
      chatId: '123456',
      serviceId: 'srv-teste',
      stopId: 'stop-1',
      leadMinutes: 5
    });

    const sub2 = radarAlerts.subscribe({
      chatId: '123456',
      serviceId: 'srv-teste',
      stopId: 'stop-1',
      leadMinutes: 12
    });

    assert.equal(sub1.id, sub2.id);
    assert.equal(sub2.leadMinutes, 12);
    assert.equal(radarAlerts.subscriptions.size, 1);
  });

  test('unsubscribe remove inscrição por ID', () => {
    const sub = radarAlerts.subscribe({
      chatId: '123',
      serviceId: 's',
      stopId: 'st'
    });

    assert.equal(radarAlerts.unsubscribe(sub.id), true);
    assert.equal(radarAlerts.unsubscribe('inexistente'), false);
    assert.equal(radarAlerts.subscriptions.size, 0);
  });

  test('list filtra por chatId', () => {
    radarAlerts.subscribe({ chatId: 'user_1', serviceId: 's1', stopId: 'p1' });
    radarAlerts.subscribe({ chatId: 'user_1', serviceId: 's2', stopId: 'p2' });
    radarAlerts.subscribe({ chatId: 'user_2', serviceId: 's3', stopId: 'p3' });

    assert.equal(radarAlerts.list('user_1').length, 2);
    assert.equal(radarAlerts.list('user_2').length, 1);
    assert.equal(radarAlerts.list().length, 3);
  });

  test('getDeepLink constrói URL do Telegram com parâmetros', () => {
    const link = radarAlerts.getDeepLink('srv-99', 'stop-88', 7);
    assert.ok(link.includes('https://t.me/'));
    assert.ok(link.includes('start=alert_srv-99_stop-88_7'));
  });
});

describe('RadarAlertsService - Checagem de Alertas e Notificações', () => {
  beforeEach(() => {
    radarAlerts.subscriptions.clear();
  });

  test('checkAlerts notifica quando veículo entra na janela de antecedência', async t => {
    radarAlerts.subscribe({
      chatId: '999',
      serviceId: 'gtfs-sp-srv-1273',
      stopId: 'stop_1',
      lineCode: '8000-10',
      leadMinutes: 8
    });

    // Mock do provider para simular ônibus a 5 minutos
    const mockProvider = {
      getStopPredictions: async () => ({
        vehicles: [
          { vehicleId: 'V-100', licensePlate: 'ABC-123', minutesUntilArrival: 5 }
        ]
      })
    };

    t.mock.method(providerRegistry, 'getProviderForService', () => mockProvider);
    const sentCalls = [];
    t.mock.method(radarAlerts, 'sendTelegram', async (chatId, msg) => {
      sentCalls.push({ chatId, msg });
      return true;
    });

    const count = await radarAlerts.checkAlerts();
    assert.equal(count, 1);
    assert.equal(sentCalls.length, 1);
    assert.equal(sentCalls[0].chatId, '999');
    assert.ok(sentCalls[0].msg.includes('8000-10'));
    assert.ok(sentCalls[0].msg.includes('5 minutos'));

    // Segunda checagem imediata não deve re-notificar o mesmo veículo
    const count2 = await radarAlerts.checkAlerts();
    assert.equal(count2, 0);
  });
});

describe('RadarAlertsService - Webhook do Telegram', () => {
  beforeEach(() => {
    radarAlerts.subscriptions.clear();
  });

  test('handleTelegramWebhook processa /start com deep link de ativação', async t => {
    t.mock.method(radarAlerts, 'sendTelegram', async () => true);

    const update = {
      message: {
        chat: { id: 777 },
        text: '/start alert_srv-x_stop-y_10'
      }
    };

    const res = await radarAlerts.handleTelegramWebhook(update);
    assert.equal(res.ok, true);
    assert.equal(res.action, 'subscribed');

    const subs = radarAlerts.list('777');
    assert.equal(subs.length, 1);
    assert.equal(subs[0].serviceId, 'srv-x');
    assert.equal(subs[0].stopId, 'stop-y');
    assert.equal(subs[0].leadMinutes, 10);
  });

  test('handleTelegramWebhook processa /start genérico', async t => {
    let sentMsg = '';
    t.mock.method(radarAlerts, 'sendTelegram', async (chatId, text) => {
      sentMsg = text;
      return true;
    });

    const update = { message: { chat: { id: 777 }, text: '/start' } };
    const res = await radarAlerts.handleTelegramWebhook(update);
    assert.equal(res.ok, true);
    assert.equal(res.action, 'welcome');
    assert.ok(sentMsg.includes('Bem-vindo ao Nexto+ Radar'));
  });

  test('handleTelegramWebhook processa /alertas', async t => {
    radarAlerts.subscribe({ chatId: '777', serviceId: 's', stopId: 'p', lineCode: 'Linha 10' });
    let sentMsg = '';
    t.mock.method(radarAlerts, 'sendTelegram', async (chatId, text) => {
      sentMsg = text;
      return true;
    });

    const update = { message: { chat: { id: 777 }, text: '/alertas' } };
    const res = await radarAlerts.handleTelegramWebhook(update);
    assert.equal(res.ok, true);
    assert.equal(res.action, 'list');
    assert.ok(sentMsg.includes('Linha 10'));
  });

  test('handleTelegramWebhook cancela radar com /cancelar', async t => {
    const sub = radarAlerts.subscribe({ chatId: '777', serviceId: 's', stopId: 'p' });
    t.mock.method(radarAlerts, 'sendTelegram', async () => true);

    const update = { message: { chat: { id: 777 }, text: `/cancelar_${sub.id}` } };
    const res = await radarAlerts.handleTelegramWebhook(update);
    assert.equal(res.ok, true);
    assert.equal(res.action, 'unsubscribed');
    assert.equal(res.removed, true);
    assert.equal(radarAlerts.subscriptions.size, 0);
  });
});
