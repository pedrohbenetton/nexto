const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server/index');

describe('server/index bootstrap & hardening', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await new Promise(resolve => {
      const s = app.listen(0, () => resolve(s));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise(resolve => server.close(resolve)));

  test('aplica cabeçalhos de segurança e remove x-powered-by', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  });

  test('retorna 404 em rota /api inexistente sem tentar servir index.html', async () => {
    const res = await fetch(`${baseUrl}/api/rota-que-nao-existe`);
    assert.equal(res.status, 404);
  });

  test('rejeita payloads JSON acima de 16kb com 413 em formato JSON', async () => {
    const huge = 'x'.repeat(20 * 1024);
    const res = await fetch(`${baseUrl}/api/crowding/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: huge, level: 'low' })
    });
    assert.equal(res.status, 413);
    const body = await res.json();
    assert.ok(body.error);
  });

  test('rejeita JSON malformado com 400 em formato JSON sem vazar stack trace', async () => {
    const res = await fetch(`${baseUrl}/api/crowding/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{json_invalido'
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });
});
