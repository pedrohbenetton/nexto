import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTvParams,
  buildTvUrl,
  buildMobileQrUrl,
  formatTvCountdown,
  getNextScheduledArrival,
  aggregateTvDepartures
} from './tvCore.js';

describe('parseTvParams & buildTvUrl', () => {
  test('parseTvParams extrai parâmetros válidos da query string', () => {
    const qs = '?stopId=s-1700&cityId=35&cityName=Sorocaba&title=Portaria%20Principal&lines=80,44&notice=Biblioteca%2022h';
    const params = parseTvParams(qs);
    assert.equal(params.stopId, 's-1700');
    assert.equal(params.cityId, 35);
    assert.equal(params.cityName, 'Sorocaba');
    assert.equal(params.title, 'Portaria Principal');
    assert.deepEqual(params.lines, ['80', '44']);
    assert.equal(params.notice, 'Biblioteca 22h');
    assert.equal(params.isConfigured, true);
  });

  test('parseTvParams retorna defaults quando query string está vazia', () => {
    const params = parseTvParams('');
    assert.equal(params.stopId, null);
    assert.equal(params.cityId, 35);
    assert.equal(params.cityName, 'Sorocaba');
    assert.equal(params.title, 'Painel de Transporte');
    assert.deepEqual(params.lines, []);
    assert.equal(params.notice, '');
    assert.equal(params.isConfigured, false);
  });

  test('buildTvUrl gera URL canônica para Smart TV', () => {
    const url = buildTvUrl({
      stopId: 's-1700',
      stopName: 'Armando Pannunzio',
      cityId: 35,
      cityName: 'Sorocaba',
      title: 'Portaria UFSCar',
      lines: ['80'],
      notice: 'Aulas normais'
    }, 'http://localhost:3001');

    assert.ok(url.startsWith('http://localhost:3001/tv?'));
    assert.match(url, /stopId=s-1700/);
    assert.match(url, /cityId=35/);
    assert.match(url, /title=Portaria\+UFSCar|title=Portaria%20UFSCar/);
    assert.match(url, /lines=80/);
  });

  test('buildMobileQrUrl gera link com utm de rastreamento para o passageiro que aponta a câmera', () => {
    const qrUrl = buildMobileQrUrl({
      stopId: 's-1700',
      cityId: 35,
      stopName: 'Ponto Central'
    }, 'https://nexto.app.br');

    assert.ok(qrUrl.startsWith('https://nexto.app.br/?'));
    assert.match(qrUrl, /stopId=s-1700/);
    assert.match(qrUrl, /ref=tv/);
    assert.match(qrUrl, /utm_source=nexto_tv/);
  });
});

describe('formatTvCountdown', () => {
  test('detecta veículo chegando em menos de 60 segundos com status pulsante', () => {
    const res = formatTvCountdown(45, 0, true);
    assert.equal(res.status, 'arriving');
    assert.equal(res.text, 'Chegando');
    assert.equal(res.badge, 'GPS AO VIVO');
    assert.equal(res.pulse, true);
  });

  test('formata minutos para ônibus iminente (1 a 5 minutos)', () => {
    const res = formatTvCountdown(180, 3, true);
    assert.equal(res.status, 'imminent');
    assert.equal(res.text, '3 min');
    assert.equal(res.badge, 'GPS AO VIVO');
    assert.equal(res.pulse, true);
  });

  test('formata minutos para ônibus além de 5 minutos', () => {
    const res = formatTvCountdown(720, 12, true);
    assert.equal(res.status, 'normal');
    assert.equal(res.text, '12 min');
    assert.equal(res.badge, 'GPS AO VIVO');
    assert.equal(res.pulse, false);
  });

  test('identifica horário agendado/tabela quando não é tempo real', () => {
    const res = formatTvCountdown(0, 0, false, '16:45');
    assert.equal(res.status, 'scheduled');
    assert.equal(res.text, '16:45');
    assert.equal(res.badge, 'Tabela');
    assert.equal(res.pulse, false);
  });
});

describe('getNextScheduledArrival', () => {
  test('encontra o próximo horário hoje a partir de uma lista ordenada', () => {
    const departures = ['06:00', '07:15', '08:30', '12:00', '18:45', '22:10'];
    const now1 = new Date(2026, 10, 18, 7, 30, 0); // 07:30
    assert.equal(getNextScheduledArrival(departures, now1), '08:30');

    const now2 = new Date(2026, 10, 18, 23, 0, 0); // 23:00 -> cai no primeiro de amanhã
    assert.equal(getNextScheduledArrival(departures, now2), '06:00');
  });

  test('retorna null para lista vazia ou inválida', () => {
    assert.equal(getNextScheduledArrival([], new Date()), null);
    assert.equal(getNextScheduledArrival(null, new Date()), null);
  });
});

describe('aggregateTvDepartures', () => {
  test('combina previsões em tempo real com horários de tabela e respeita filtro de linhas', () => {
    const liveVehicles = [
      {
        vehicleId: 'v-2654',
        routeCode: '80',
        routeMnemonic: 'UFSCAR',
        serviceMnemonic: 'Centro',
        lineRoutesPath: 'sorocaba-80-centro',
        secondsUntilArrival: 240,
        minutesUntilArrival: 4,
        isRealTime: true,
        bgColor: '#059669',
        fgColor: '#ffffff'
      },
      {
        vehicleId: 'v-9999',
        routeCode: '99',
        routeMnemonic: 'LINHA FORA',
        serviceMnemonic: 'Bairro',
        secondsUntilArrival: 120,
        minutesUntilArrival: 2,
        isRealTime: true
      }
    ];

    const scheduledLines = [
      {
        routeCode: '44',
        routeMnemonic: 'EDEN',
        serviceMnemonic: 'Terminal',
        lineRoutesPath: 'sorocaba-44',
        departures: ['18:00', '18:30'],
        bgColor: '#2563eb'
      }
    ];

    // Filtra apenas linhas 80 e 44
    const result = aggregateTvDepartures({
      liveVehicles,
      scheduledLines,
      linesFilter: ['80', '44'],
      now: new Date(2026, 10, 18, 17, 45, 0)
    });

    assert.equal(result.length, 2);
    // Linha 80 ao vivo vem primeiro (4 min)
    assert.equal(result[0].routeCode, '80');
    assert.equal(result[0].isRealTime, true);
    assert.equal(result[0].timeText, '4 min');

    // Linha 44 programada vem em seguida (18:00)
    assert.equal(result[1].routeCode, '44');
    assert.equal(result[1].isRealTime, false);
    assert.equal(result[1].timeText, '18:00');

    // Linha 99 foi filtrada
    assert.ok(!result.some(r => r.routeCode === '99'));
  });
});
