const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const cache = require('../server/cache');
const citta = require('../server/cittamobiService');
const nearbyStops = require('../server/nearbyStops');

beforeEach(() => {
  cache.clear();
});

describe('nearbyStops.findNearbyStopsWithLines', () => {
  test('resolve paradas próximas em cidades GTFS (cityId >= 9000) com linhas e stopId', async () => {
    // Perto do Terminal Lapa (-23.5188, -46.7022) do GTFS SP (9001)
    const stops = await nearbyStops.findNearbyStopsWithLines({
      lat: -23.5190,
      lng: -46.7020,
      cityId: 9001,
      radius: 1500,
      limit: 5
    });
    assert.ok(stops.length >= 1);
    assert.equal(stops[0].stopId, 'stop_1');
    assert.equal(stops[0].cityId, 9001);
    assert.ok(stops[0].lines.some(l => l.routeCode === '8000-10' && l.stopId === 'stop_1'));
  });

  test('enriquece paradas de cidades Cittamobi cruzando sondas OTP + getLineDetails', async t => {
    t.mock.method(citta, 'getLinesByCityId', async () => [
      {
        id: 'l-80',
        routeCode: '80',
        routeMnemonic: 'UFSCAR',
        serviceMnemonic: 'BAIRRO',
        bgColor: '#047857',
        fgColor: '#FFFFFF',
        lineRoutesPath: 'p-80-bairro',
        companyName: 'Consórcio Sorocaba'
      }
    ]);
    t.mock.method(citta, 'planTripRaw', async () => ({
      itineraries: [{
        legs: [{
          mode: 'BUS',
          routeshortname: '80',
          routelongname: 'UFSCAR',
          headsign: 'BAIRRO',
          stopfromname: 'Av. Dr. Armando Pannunzio, 1700',
          stopfromlat: -23.5282,
          stopfromlng: -47.4902,
          intermediatestopsnames: [],
          intermediatestopslat: [],
          intermediatestopslng: []
        }]
      }]
    }));
    t.mock.method(citta, 'getLineDetails', async () => ({
      serviceId: 'srv-80',
      stops: [
        { index: 0, stopId: 'stop-1700', name: 'Av. Dr. Armando Pannunzio, 1700' }
      ]
    }));

    const stops = await nearbyStops.findNearbyStopsWithLines({
      lat: -23.5279,
      lng: -47.4914,
      cityId: 35,
      radius: 2000,
      limit: 5
    });

    assert.equal(stops.length, 1);
    assert.equal(stops[0].stopId, 'stop-1700');
    assert.equal(stops[0].lines[0].serviceId, 'srv-80');
    assert.equal(stops[0].lines[0].stopId, 'stop-1700');
  });

  test('cai graciosamente para o cache local quando a consulta ao vivo falha', async t => {
    t.mock.method(console, 'warn', () => {});
    t.mock.method(citta, 'getLinesByCityId', async () => { throw new Error('offline'); });

    const stops = await nearbyStops.findNearbyStopsWithLines({
      lat: 0,
      lng: 0,
      cityId: 999,
      radius: 500,
      limit: 5
    });
    assert.deepEqual(stops, []);
  });
});
