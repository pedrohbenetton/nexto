require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const predictionHistory = require('./predictionHistory');
const crowdingRegistry = require('./crowdingRegistry');

const app = express();
const PORT = process.env.PORT || 3001;

app.disable('x-powered-by');

// Cabeçalhos de segurança básicos
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '16kb' }));
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload excede o limite de 16kb.' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
  }
  next(err);
});

// Log simplificado de requisições (suprimido durante suíte de testes)
if (!process.env.NODE_TEST_CONTEXT) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Rotas da API
app.use('/api', apiRoutes);

// 404 explícito para sub-rotas /api não encontradas
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint da API não encontrado.' });
});

// Servir frontend se construído
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));

// Fallback SPA
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), err => {
    if (err) res.status(404).json({ error: 'Frontend não construído. Execute npm run build:client.' });
  });
});

let server = null;

function startServer(port = PORT) {
  server = app.listen(port, () => {
    console.log('====================================================');
    console.log(`🚍 Nexto BFF Gateway rodando na porta ${port}`);
    console.log(`📡 URL Base: http://localhost:${port}/api`);
    console.log('====================================================');
  });

  const shutdown = () => {
    predictionHistory.flush();
    crowdingRegistry.flush();
    if (server) {
      server.close(() => process.exit(0));
    } else {
      process.exit(0);
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
