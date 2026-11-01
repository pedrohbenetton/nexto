import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LINE_PALETTE, contrastText, lineColor } from './lineColor.js';

describe('contrastText', () => {
  test('texto escuro em fundos claros e claro em fundos escuros', () => {
    assert.equal(contrastText('#c6f432'), '#0e1116');
    assert.equal(contrastText('#ffffff'), '#0e1116');
    assert.equal(contrastText('#0e1116'), '#ffffff');
    assert.equal(contrastText('#2f6fe8'), '#ffffff');
  });

  test('aceita hex curto e maiúsculo', () => {
    assert.equal(contrastText('#FFF'), '#0e1116');
  });
});

describe('lineColor', () => {
  test('usa a cor oficial da linha quando informada', () => {
    assert.deepEqual(lineColor({ routeCode: '8000', bgColor: '#E11D48', fgColor: '#FFFFFF' }), {
      bg: '#e11d48',
      fg: '#ffffff'
    });
  });

  test('calcula o texto quando só o fundo oficial vem', () => {
    assert.deepEqual(lineColor({ routeCode: '1', bgColor: '#c6f432' }), { bg: '#c6f432', fg: '#0e1116' });
  });

  test('ignora cor oficial inválida e usa a paleta', () => {
    const { bg } = lineColor({ routeCode: '80', bgColor: 'azul' });
    assert.ok(LINE_PALETTE.includes(bg));
  });

  test('cor da paleta é determinística por código de linha', () => {
    assert.deepEqual(lineColor({ routeCode: '80' }), lineColor({ routeCode: '80' }));
    assert.deepEqual(lineColor({ routeCode: '80', id: 'a' }), lineColor({ routeCode: '80', id: 'b' }));
  });

  test('códigos diferentes se distribuem pela paleta', () => {
    const used = new Set(['1', '2', '3', '10', '20', '44', '80', 'A70', 'D210', '6108'].map(c => lineColor({ routeCode: c }).bg));
    assert.ok(used.size >= 4, `apenas ${used.size} cores usadas`);
  });

  test('linha sem código não quebra', () => {
    const { bg, fg } = lineColor({});
    assert.ok(LINE_PALETTE.includes(bg));
    assert.match(fg, /^#[0-9a-f]{6}$/);
  });
});
