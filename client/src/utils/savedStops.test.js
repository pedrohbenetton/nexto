import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SAVED_STOPS, savedStopKey, isStopSaved, toggleSavedStop, toSavedStop, upcomingArrivals, formatEta
} from './savedStops.js';

const LINE = {
  id: 'l80', routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: 'CENTRO',
  lineRoutesPath: 'sorocaba/80', bgColor: '#e11d48', fgColor: '#ffffff', companyName: 'X', extra: 'ignorado'
};
const STOP = { stopId: 's1', name: 'Rua A, 10', index: 3, lat: -23.5, lng: -47.4 };
const entry = (serviceId, stopId) => ({ serviceId, stopId, stopName: stopId, line: { routeCode: '1' } });

describe('toSavedStop', () => {
  test('monta o registro com a linha resumida, o serviço e o ponto', () => {
    assert.deepEqual(toSavedStop(LINE, { serviceId: 'srv80' }, STOP), {
      serviceId: 'srv80',
      stopId: 's1',
      stopName: 'Rua A, 10',
      stopIndex: 3,
      line: {
        id: 'l80', routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: 'CENTRO',
        lineRoutesPath: 'sorocaba/80', bgColor: '#e11d48', fgColor: '#ffffff'
      }
    });
  });
});

describe('savedStopKey / isStopSaved', () => {
  test('identifica o ponto pelo par serviço + parada', () => {
    assert.equal(savedStopKey(entry('a', 'b')), 'a:b');
    const list = [entry('a', 'b')];
    assert.equal(isStopSaved(list, 'a', 'b'), true);
    assert.equal(isStopSaved(list, 'a', 'c'), false);
    assert.equal(isStopSaved(list, 'x', 'b'), false);
  });
});

describe('toggleSavedStop', () => {
  test('adiciona no topo quando ainda não está salvo', () => {
    const list = toggleSavedStop([entry('a', '1')], entry('a', '2'));
    assert.deepEqual(list.map(savedStopKey), ['a:2', 'a:1']);
  });

  test('remove quando já está salvo', () => {
    const list = toggleSavedStop([entry('a', '1'), entry('a', '2')], entry('a', '1'));
    assert.deepEqual(list.map(savedStopKey), ['a:2']);
  });

  test(`mantém no máximo ${MAX_SAVED_STOPS}, descartando o mais antigo`, () => {
    let list = [];
    for (let i = 0; i < MAX_SAVED_STOPS + 2; i++) list = toggleSavedStop(list, entry('a', String(i)));
    assert.equal(list.length, MAX_SAVED_STOPS);
    assert.equal(savedStopKey(list[0]), `a:${MAX_SAVED_STOPS + 1}`);
    assert.equal(isStopSaved(list, 'a', '0'), false);
  });

  test('não altera a lista original', () => {
    const original = [entry('a', '1')];
    toggleSavedStop(original, entry('a', '2'));
    assert.equal(original.length, 1);
  });
});

describe('formatEta', () => {
  test('até 1 minuto vira "Agora"', () => {
    assert.equal(formatEta(0), 'Agora');
    assert.equal(formatEta(60), 'Agora');
  });

  test('minutos arredondados abaixo de 1 hora', () => {
    assert.equal(formatEta(61), '1 min');
    assert.equal(formatEta(150), '3 min');
    assert.equal(formatEta(59 * 60), '59 min');
  });

  test('1 hora ou mais vira "1h05"', () => {
    assert.equal(formatEta(3600), '1h00');
    assert.equal(formatEta(3900), '1h05');
  });
});

describe('upcomingArrivals', () => {
  const predictions = {
    vehicles: [
      { vehicleId: 'c', secondsUntilArrival: 900, isRealTime: false },
      { vehicleId: 'a', secondsUntilArrival: 45, isRealTime: true },
      { vehicleId: 'x', secondsUntilArrival: -30, isRealTime: true },
      { vehicleId: 'b', secondsUntilArrival: 300, isRealTime: true },
      { vehicleId: 'd', secondsUntilArrival: 1800, isRealTime: false }
    ]
  };

  test('ordena por chegada, ignora quem já passou e limita a quantidade', () => {
    assert.deepEqual(upcomingArrivals(predictions, 3), [
      { vehicleId: 'a', seconds: 45, label: 'Agora', isRealTime: true },
      { vehicleId: 'b', seconds: 300, label: '5 min', isRealTime: true },
      { vehicleId: 'c', seconds: 900, label: '15 min', isRealTime: false }
    ]);
  });

  test('sem previsões retorna lista vazia', () => {
    assert.deepEqual(upcomingArrivals(null), []);
    assert.deepEqual(upcomingArrivals({ vehicles: [] }), []);
  });
});
