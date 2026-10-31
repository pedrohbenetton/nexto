import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LINE_FILTERS, lineId, matchesFilter, matchesSearch, filterLines, countByFilter } from './lineFilters.js';

const BRT = { id: 'a', routeCode: '8000-10', routeMnemonic: 'TERMINAL LAPA', serviceMnemonic: 'PRAÇA RAMOS', tags: ['GTFS-RT', 'BRT'] };
const BRT_NAME = { id: 'b', routeCode: 'BRT1', routeMnemonic: 'EXPRESSO', serviceMnemonic: 'TERMINAL' };
const TO_CENTRO = { id: 'c', routeCode: '80', routeMnemonic: 'UFSCAR', serviceMnemonic: 'CENTRO', companyName: 'Consórcio Sorocaba' };
const TO_BAIRRO = { id: 'd', routeCode: '80', routeMnemonic: 'CENTRO', serviceMnemonic: 'UFSCAR' };
const NO_ID = { routeCode: '44', routeMnemonic: 'EDEN' };
const LINES = [BRT, BRT_NAME, TO_CENTRO, TO_BAIRRO, NO_ID];

describe('lineId', () => {
  test('usa id e cai para routeCode', () => {
    assert.equal(lineId(BRT), 'a');
    assert.equal(lineId(NO_ID), '44');
  });
});

describe('matchesFilter', () => {
  test('"all" aceita qualquer linha', () => {
    assert.ok(LINES.every(l => matchesFilter(l, 'all', [])));
  });

  test('"favorites" usa a lista de ids favoritos', () => {
    assert.equal(matchesFilter(TO_CENTRO, 'favorites', ['c']), true);
    assert.equal(matchesFilter(NO_ID, 'favorites', ['44']), true);
    assert.equal(matchesFilter(BRT, 'favorites', ['c']), false);
  });

  test('"brt" detecta tag ou nome com BRT (case-insensitive)', () => {
    assert.equal(matchesFilter(BRT, 'brt', []), true);
    assert.equal(matchesFilter(BRT_NAME, 'brt', []), true);
    assert.equal(matchesFilter({ routeMnemonic: 'Corredor brt Norte' }, 'brt', []), true);
    assert.equal(matchesFilter(TO_CENTRO, 'brt', []), false);
  });

  test('"centro" e "bairro" usam o destino (serviceMnemonic)', () => {
    assert.equal(matchesFilter(TO_CENTRO, 'centro', []), true);
    assert.equal(matchesFilter(TO_CENTRO, 'bairro', []), false);
    assert.equal(matchesFilter(TO_BAIRRO, 'bairro', []), true);
    assert.equal(matchesFilter(TO_BAIRRO, 'centro', []), false);
  });

  test('linha sem destino não entra em centro nem bairro', () => {
    assert.equal(matchesFilter(NO_ID, 'centro', []), false);
    assert.equal(matchesFilter(NO_ID, 'bairro', []), false);
  });

  test('filtro desconhecido não filtra', () => {
    assert.equal(matchesFilter(BRT, 'xyz', []), true);
  });
});

describe('matchesSearch', () => {
  test('termo vazio aceita tudo', () => {
    assert.equal(matchesSearch(BRT, '   '), true);
  });

  test('busca em código, nomes e operadora', () => {
    assert.equal(matchesSearch(TO_CENTRO, '80'), true);
    assert.equal(matchesSearch(TO_CENTRO, 'ufscar'), true);
    assert.equal(matchesSearch(TO_CENTRO, 'consórcio'), true);
    assert.equal(matchesSearch(TO_CENTRO, 'eden'), false);
  });
});

describe('filterLines', () => {
  test('combina categoria e busca', () => {
    const result = filterLines(LINES, { filter: 'centro', searchTerm: 'ufscar', favorites: [] });
    assert.deepEqual(result, [TO_CENTRO]);
  });
});

describe('countByFilter', () => {
  test('conta linhas por categoria respeitando a busca', () => {
    const counts = countByFilter(LINES, { searchTerm: '', favorites: ['a', '44'] });
    assert.deepEqual(counts, { all: 5, favorites: 2, brt: 2, centro: 1, bairro: 3 });

    const searched = countByFilter(LINES, { searchTerm: 'ufscar', favorites: [] });
    assert.equal(searched.all, 2);
    assert.equal(searched.brt, 0);
  });

  test('tem uma contagem para cada filtro declarado', () => {
    const counts = countByFilter([], { searchTerm: '', favorites: [] });
    assert.deepEqual(Object.keys(counts).sort(), LINE_FILTERS.map(f => f.id).sort());
  });
});
