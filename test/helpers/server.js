const express = require('express');
const apiRoutes = require('../../server/routes/api');

// Sobe o router da API em uma porta efêmera, sem o bootstrap de server/index.js
async function startApi() {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  return {
    baseUrl,
    get: path => fetch(`${baseUrl}${path}`),
    post: (path, body) => fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    close: () => new Promise(resolve => server.close(resolve))
  };
}

module.exports = { startApi };
