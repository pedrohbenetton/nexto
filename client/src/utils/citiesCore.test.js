import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { POPULAR_CITIES, DEFAULT_CITY, normalizeSavedCity, getCityCoords, cleanCitySearchName } from './citiesCore.js';

describe('citiesCore', () => {
  test('POPULAR_CITIES usa os IDs reais do catálogo Cittamobi para capitais e Sorocaba', () => {
    const byName = Object.fromEntries(POPULAR_CITIES.map(c => [c.cityName, c.cityId]));
    assert.equal(byName['Sorocaba'], 35);
    assert.equal(byName['São Paulo'], 28);
    assert.equal(byName['Salvador'], 8);
    assert.equal(byName['Belo Horizonte'], 16);
    assert.equal(byName['Recife'], 20);
    assert.equal(byName['Brasília'], 10);
    assert.equal(byName['Maceió'], 5);
  });

  test('normalizeSavedCity migra IDs legados incorretos no localStorage e preserva cidades válidas ou GTFS', () => {
    assert.deepEqual(normalizeSavedCity(null), DEFAULT_CITY);
    assert.deepEqual(normalizeSavedCity({ cityId: 1, cityName: 'São Paulo', stateInitials: 'SP' }), {
      cityId: 28,
      cityName: 'São Paulo',
      stateInitials: 'SP'
    });
    assert.deepEqual(normalizeSavedCity({ cityId: 10, cityName: 'Salvador', stateInitials: 'BA' }), {
      cityId: 8,
      cityName: 'Salvador',
      stateInitials: 'BA'
    });
    assert.deepEqual(normalizeSavedCity({ cityId: 14, cityName: 'Belo Horizonte', stateInitials: 'MG' }), {
      cityId: 16,
      cityName: 'Belo Horizonte',
      stateInitials: 'MG'
    });
    assert.deepEqual(normalizeSavedCity({ cityId: 18, cityName: 'Recife', stateInitials: 'PE' }), {
      cityId: 20,
      cityName: 'Recife',
      stateInitials: 'PE'
    });
    assert.deepEqual(normalizeSavedCity({ cityId: 22, cityName: 'Maceió', stateInitials: 'AL' }), {
      cityId: 5,
      cityName: 'Maceió',
      stateInitials: 'AL'
    });
    // Pelotas real (cityId=1 com cityName="Pelotas") ou GTFS (9001) permanece intacto!
    assert.deepEqual(normalizeSavedCity({ cityId: 1, cityName: 'Pelotas', stateInitials: 'RS' }), {
      cityId: 1,
      cityName: 'Pelotas',
      stateInitials: 'RS'
    });
    assert.deepEqual(normalizeSavedCity({ cityId: 9001, cityName: 'São Paulo (GTFS Aberto)', stateInitials: 'SP' }), {
      cityId: 9001,
      cityName: 'São Paulo (GTFS Aberto)',
      stateInitials: 'SP'
    });
  });

  test('getCityCoords e cleanCitySearchName fornecem coordenadas de viés geográfico e nome limpo', () => {
    const soro = getCityCoords({ cityId: 35, cityName: 'Sorocaba' });
    assert.ok(soro && Math.abs(soro.lat - (-23.505)) < 0.05);
    const salv = getCityCoords({ cityId: 8, cityName: 'Salvador' });
    assert.ok(salv && Math.abs(salv.lat - (-12.97)) < 0.05);
    const gtfsSp = getCityCoords({ cityId: 9001, cityName: 'São Paulo (GTFS Aberto)' });
    assert.ok(gtfsSp && Math.abs(gtfsSp.lat - (-23.55)) < 0.05);
    assert.equal(getCityCoords({ cityId: 99999, cityName: 'Cidade Desconhecida' }), null);

    assert.equal(cleanCitySearchName('São Paulo (GTFS Aberto)'), 'São Paulo');
    assert.equal(cleanCitySearchName('Sorocaba'), 'Sorocaba');
    assert.equal(cleanCitySearchName(null), '');
  });
});
