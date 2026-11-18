const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  haversineDistance,
  walkMinutes,
  normalizeRouteCode,
  buildDirectionalTargets,
  extractRawStopsFromPlans,
  matchCatalogLines,
  matchStopInLineDetails,
  assembleNearbyStops
} = require('../server/nearbyStopsCore');
const { cleanStopAddress } = require('../server/cittamobiService');

describe('nearbyStopsCore', () => {
  test('haversineDistance e walkMinutes calculam distância e caminhada mínima de 1 min', () => {
    assert.equal(haversineDistance(-23.5, -47.4, -23.5, -47.4), 0);
    assert.equal(walkMinutes(0), 1);
    assert.equal(walkMinutes(240), 3);
  });

  test('normalizeRouteCode unifica barras, hífens e espaços (T44/1 == T441)', () => {
    assert.equal(normalizeRouteCode('T44/1'), 't441');
    assert.equal(normalizeRouteCode(' 80-A '), '80a');
    assert.equal(normalizeRouteCode(''), '');
  });

  test('buildDirectionalTargets gera 4 alvos cardeais ao redor do usuário', () => {
    const targets = buildDirectionalTargets(-23.5, -47.4, 2500);
    assert.equal(targets.length, 4);
    assert.ok(targets[0].toLat > -23.5);
    assert.ok(targets[1].toLat < -23.5);
    assert.ok(targets[2].toLng > -47.4);
    assert.ok(targets[3].toLng < -47.4);
  });

  test('extractRawStopsFromPlans coleta embarque, intermediárias e desembarque dentro do raio e separa lados opostos da via', () => {
    const rawPlans = [{
      itineraries: [{
        legs: [
          { mode: 'WALK', stopfromname: 'Origem', stopfromlat: -23.5279, stopfromlng: -47.4914 },
          {
            mode: 'BUS',
            routeshortname: '80',
            headsign: 'U F S C A R - Centro',
            routelongname: 'Ufscar',
            stopfromname: 'Av. Dr. Armando Pannunzio, 1767 - Jardim Sao Carlos',
            stopfromlat: -23.52828,
            stopfromlng: -47.48987,
            intermediatestopsnames: ['Av. Dr. Armando Pannunzio, 1407 - Jardim Piazza Di Roma'],
            intermediatestopslat: [-23.52580],
            intermediatestopslng: [-47.49050],
            stoptoname: 'Terminal São Paulo (longe)',
            stoptolat: -23.50542,
            stoptolng: -47.45272
          },
          {
            mode: 'BUS',
            routeshortname: '80',
            headsign: 'U F S C A R - Bairro',
            routelongname: 'Ufscar',
            stopfromname: 'Av. Dr. Armando Pannunzio, 1700 - Jardim Piazza Di Roma',
            stopfromlat: -23.52821,
            stopfromlng: -47.49020,
            intermediatestopsnames: [],
            intermediatestopslat: [],
            intermediatestopslng: [],
            stoptoname: 'UFSCar',
            stoptolat: -23.58286,
            stoptolng: -47.52407
          }
        ]
      }]
    }];

    const stops = extractRawStopsFromPlans(rawPlans, { lat: -23.5279, lng: -47.4914, radiusMeters: 1000 });
    assert.equal(stops.length, 3);
    assert.ok(stops.some(s => s.name.includes('1767')));
    assert.ok(stops.some(s => s.name.includes('1700')));
    assert.ok(stops.some(s => s.name.includes('1407')));
    assert.ok(!stops.some(s => s.name.includes('Terminal São Paulo')));
  });

  test('matchCatalogLines prioriza sentido correto e resolve códigos com barra (T44/1 -> T441)', () => {
    const catalog = [
      { routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: '1 - Inicia na Garagem City - centro', lineRoutesPath: 'p-80-gar' },
      { routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: 'U F S C A R - Bairro', lineRoutesPath: 'p-80-bairro' },
      { routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: 'U F S C A R - Centro', lineRoutesPath: 'p-80-centro' },
      { routeCode: 'T441', routeMnemonic: 'MT Tatiana', serviceMnemonic: '01 - Tatiana - centro', lineRoutesPath: 'p-t441-centro' },
      { routeCode: 'T441', routeMnemonic: 'MT Tatiana', serviceMnemonic: '01 - Tatiana - bairro', lineRoutesPath: 'p-t441-bairro' }
    ];

    const m80 = matchCatalogLines({ routeCode: '80', headsign: 'U F S C A R - Centro', lineName: 'Ufscar' }, catalog);
    assert.equal(m80[0].lineRoutesPath, 'p-80-centro');

    const mt = matchCatalogLines({ routeCode: 'T44/1', headsign: '01 - Tatiana - bairro', lineName: 'Mt Tatiana' }, catalog);
    assert.equal(mt[0].lineRoutesPath, 'p-t441-bairro');

    assert.deepEqual(matchCatalogLines({ routeCode: '999', headsign: 'Inexistente' }, catalog), []);
  });

  test('matchStopInLineDetails casa SP-079 higienizado e diferencia números na mesma avenida', () => {
    const detailStops = [
      { index: 0, stopId: 'stop-1970', name: 'Av. Dr. Armando Pannunzio, 1970 - Jardim Piazza Di Roma, Sorocaba - SP' },
      { index: 1, stopId: 'stop-1767', name: 'Av. Dr. Armando Pannunzio, 1767 - Jardim Sao Carlos, Sorocaba - SP' },
      { index: 2, stopId: 'stop-1700', name: 'Av. Dr. Armando Pannunzio, 1700 - Jardim Piazza Di Roma, Sorocaba - SP' }
    ];

    const s1970 = matchStopInLineDetails(
      'SP-079, 1970 - Jardim Piazza Di Roma, Sorocaba - SP, 18050-000, Brasil',
      detailStops,
      cleanStopAddress
    );
    assert.equal(s1970?.stopId, 'stop-1970');

    const s1767 = matchStopInLineDetails(
      'Av. Dr. Armando Pannunzio, 1767 - Jardim Sao Carlos, Sorocaba - SP, 18051-735, Brasil',
      detailStops,
      cleanStopAddress
    );
    assert.equal(s1767?.stopId, 'stop-1767');
  });

  test('assembleNearbyStops resolve stopId, deduplica subvariações equivalentes e cruza outras linhas no mesmo stopId', () => {
    const catalogLines = [
      { id: '1', routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: 'U F S C A R - Centro', lineRoutesPath: 'p-80-c' },
      { id: '2', routeCode: '44', routeMnemonic: 'Novo Mundo', serviceMnemonic: 'Centro', lineRoutesPath: 'p-44-c-util' },
      { id: '3', routeCode: '44', routeMnemonic: 'Novo Mundo', serviceMnemonic: 'Centro', lineRoutesPath: 'p-44-c-dom' },
      { id: '4', routeCode: 'D210', routeMnemonic: 'Leste / Oeste', serviceMnemonic: 'D210 - UNISO', lineRoutesPath: 'p-d210' }
    ];

    const detailsByPath = new Map([
      ['p-80-c', {
        serviceId: 'srv-80',
        stops: [{ stopId: 'stop-1767', name: 'Av. Dr. Armando Pannunzio, 1767 - Jardim Sao Carlos, Sorocaba - SP' }]
      }],
      ['p-44-c-util', {
        serviceId: 'srv-44-util',
        stops: [{ stopId: 'stop-1767', name: 'Av. Dr. Armando Pannunzio, 1767 - Jardim Sao Carlos, Sorocaba - SP' }]
      }],
      ['p-44-c-dom', {
        serviceId: 'srv-44-dom',
        stops: [{ stopId: 'stop-1767', name: 'Av. Dr. Armando Pannunzio, 1767 - Jardim Sao Carlos, Sorocaba - SP' }]
      }],
      ['p-d210', {
        serviceId: 'srv-d210',
        stops: [{ stopId: 'stop-1767', name: 'Av. Dr. Armando Pannunzio, 1767 - Jardim Sao Carlos, Sorocaba - SP' }]
      }]
    ]);

    const rawStops = [{
      name: 'Av. Dr. Armando Pannunzio, 1767 - Jardim Sao Carlos, Sorocaba - SP, 18051-735, Brasil',
      lat: -23.52828,
      lng: -47.48987,
      distanceMeters: 160,
      legSigs: [
        { routeCode: '80', headsign: 'U F S C A R - Centro', lineName: 'Ufscar' },
        { routeCode: '44', headsign: 'Centro', lineName: 'Novo Mundo' }
      ]
    }];

    const assembled = assembleNearbyStops({
      rawStops,
      catalogLines,
      detailsByPath,
      cityId: 35,
      cleanFn: cleanStopAddress,
      limit: 10
    });

    assert.equal(assembled.length, 1);
    const stop = assembled[0];
    assert.equal(stop.stopId, 'stop-1767');
    assert.equal(stop.name, 'Av. Dr. Armando Pannunzio, 1767');
    assert.equal(stop.walkTimeMinutes, 2);
    // 80 + 44 (deduplicada entre útil/domingo) + D210 (cruzada pelo mesmo stopId!)
    assert.deepEqual(stop.lines.map(l => l.routeCode).sort(), ['44', '80', 'D210']);
    assert.ok(stop.lines.every(l => l.stopId === 'stop-1767' && l.serviceId));
  });

  test('assembleNearbyStops não anexa segundo candidato (sentido oposto) quando details não foi carregado', () => {
    const catalogLines = [
      { id: '1', routeCode: 'E220', routeMnemonic: 'Guadalajara', serviceMnemonic: 'E220 - TERMINAL SANTO ANTONIO', lineRoutesPath: 'p-e220-tsa' },
      { id: '2', routeCode: 'E220', routeMnemonic: 'Guadalajara', serviceMnemonic: 'E220 - GUADALAJARA', lineRoutesPath: 'p-e220-guad' }
    ];
    const detailsByPath = new Map([
      ['p-e220-tsa', {
        serviceId: 'srv-tsa',
        stops: [{ stopId: 'stop-1077', name: 'Av. Dr. Armando Pannunzio, 1077 - Sorocaba - SP' }]
      }]
      // p-e220-guad intencionalmente ausente de detailsByPath
    ]);

    const assembled = assembleNearbyStops({
      rawStops: [{
        name: 'Av. Dr. Armando Pannunzio, 1077 - Sorocaba - SP',
        lat: -23.5226,
        lng: -47.4911,
        distanceMeters: 200,
        legSigs: [{ routeCode: 'E220', headsign: 'E220 - TERMINAL SANTO ANTONIO', lineName: 'Guadalajara' }]
      }],
      catalogLines,
      detailsByPath,
      cityId: 35,
      cleanFn: cleanStopAddress
    });

    assert.equal(assembled[0].lines.length, 1);
    assert.equal(assembled[0].lines[0].lineRoutesPath, 'p-e220-tsa');
  });
});
