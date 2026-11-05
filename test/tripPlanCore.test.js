const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { buildPlanRequest, decodePolyline, normalizeTripPlan } = require('../server/tripPlanCore');

describe('buildPlanRequest', () => {
  test('monta o corpo no formato do planejador do Cittamobi', () => {
    const body = buildPlanRequest({ fromLat: -23.58, fromLng: -47.52, toLat: -23.53, toLng: -47.48, dateTime: 1000 });
    assert.deepEqual(body, {
      from_lat: -23.58, from_lng: -47.52, to_lat: -23.53, to_lng: -47.48,
      dateTime: 1000, arriveOrDepart: 0, maxWalkDistance: 1000, mode: ['BUS', 'RAIL', 'FERRY']
    });
  });

  test('arriveBy vira arriveOrDepart=1 e maxWalkDistance é respeitado', () => {
    const body = buildPlanRequest({ fromLat: 1, fromLng: 2, toLat: 3, toLng: 4, dateTime: 5, arriveBy: true, maxWalkDistance: 400 });
    assert.equal(body.arriveOrDepart, 1);
    assert.equal(body.maxWalkDistance, 400);
  });

  test('dateTime padrão é agora (ms)', () => {
    const before = Date.now();
    const body = buildPlanRequest({ fromLat: 1, fromLng: 2, toLat: 3, toLng: 4 });
    assert.ok(body.dateTime >= before && body.dateTime <= Date.now());
  });
});

describe('decodePolyline', () => {
  test('decodifica o exemplo oficial do Google (precisão 5)', () => {
    assert.deepEqual(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [
      [38.5, -120.2], [40.7, -120.95], [43.252, -126.453]
    ]);
  });

  test('string vazia ou ausente retorna lista vazia', () => {
    assert.deepEqual(decodePolyline(''), []);
    assert.deepEqual(decodePolyline(undefined), []);
  });
});

describe('normalizeTripPlan', () => {
  const RAW = {
    fromname: 'Origin', fromlat: -23.58, fromlng: -47.52,
    toname: 'Destination', tolat: -23.53, tolng: -47.48,
    itineraries: [{
      duration: '1219', starttime: '1000000', endtime: '2219000', walkdistance: 659.17, fare: -1,
      legs: [
        { mode: 'WALK', starttime: '1000000', endtime: '1464000', distance: 632.69,
          stopfromname: 'Origin', stopfromlat: -23.58, stopfromlng: -47.52,
          stoptoname: 'Rod. João Leme', stoptolat: -23.57, stoptolng: -47.51, geometrypoints: '_p~iF~ps|U_ulLnnqC' },
        { mode: 'BUS', starttime: '1464000', endtime: '2200000', distance: 7760.27,
          route: 'Ufscar', routeshortname: '80', routelongname: 'Ufscar', headsign: 'U F S C A R - Centro',
          color: 'FF6600', textcolor: 'FFFFFF',
          stopfromname: 'Rod. João Leme', stoptoname: 'Av. Armando', intermediatestopsnames: ['A', 'B'] }
      ]
    }]
  };

  test('converte tempos, distâncias e esconde tarifa desconhecida (-1)', () => {
    const plan = normalizeTripPlan(RAW);
    assert.equal(plan.hasError, false);
    assert.deepEqual(plan.from, { name: 'Origin', lat: -23.58, lng: -47.52 });
    const it = plan.itineraries[0];
    assert.equal(it.durationMin, 20);
    assert.equal(it.startTime, new Date(1000000).toISOString());
    assert.equal(it.walkDistanceM, 659);
    assert.equal(it.fare, null);
  });

  test('pernas: caminhada vs ônibus, geometria decodificada e baldeações', () => {
    const it = normalizeTripPlan(RAW).itineraries[0];
    const [walk, bus] = it.legs;
    assert.equal(walk.isWalk, true);
    assert.deepEqual(walk.path, [[38.5, -120.2], [40.7, -120.95]]);
    assert.equal(bus.isWalk, false);
    assert.equal(bus.lineCode, '80');
    assert.equal(bus.headsign, 'U F S C A R - Centro');
    assert.equal(bus.durationMin, 12);
    assert.deepEqual(bus.intermediateStops, ['A', 'B']);
    assert.equal(it.transfers, 0);
  });

  test('conta baldeações como pernas de ônibus - 1', () => {
    const raw = { itineraries: [{ legs: [{ mode: 'BUS' }, { mode: 'WALK' }, { mode: 'BUS' }, { mode: 'BUS' }] }] };
    assert.equal(normalizeTripPlan(raw).itineraries[0].transfers, 2);
  });

  test('erro do planejador vira hasError com mensagem e sem itinerários', () => {
    const plan = normalizeTripPlan({ haserror: true, errorid: -1, errormsg: 'Ocorreu um erro' });
    assert.equal(plan.hasError, true);
    assert.equal(plan.errorMessage, 'Ocorreu um erro');
    assert.deepEqual(plan.itineraries, []);
  });
});
