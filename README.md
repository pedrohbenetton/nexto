# 🚍 Nexto — Transporte Público em Tempo Real, Zero Anúncios

> **Nexto** é uma plataforma mobile-first, PWA e empacotada para Android via Capacitor, **100% livre de anúncios**, para rastreamento de transporte público em tempo real, planejamento de rotas A→B com baldeação e confiabilidade histórica de linhas.

---

## ⚡ Recursos Principais

- 📍 **Meus Pontos na Home**: Quadro imediato com as próximas partidas ao vivo nos seus pares `linha + parada` salvos, com projeção offline do último retrato quando sem sinal e fixação de contagem regressiva na barra de notificações (Android).
- 🧭 **Perto de Mim Inteligente**: Localiza paradas próximas pelo GPS, identifica todas as linhas que atendem cada ponto (distinguindo lados opostos da via) e abre o painel da linha posicionado direto naquela parada.
- 🗺️ **Planejador de Rotas A → B com Baldeação**: Cálculo porta a porta com escolha de horário (*Agora*, *Sair às*, *Chegar às*), atalhos salvos (**Casa** / **Trabalho**), mapa completo do trajeto e abertura ao vivo da linha na parada de embarque.
- 🛰️ **Radar de Ônibus ao Vivo no Mapa**: Exibe estritamente veículos com telemetria GPS ativa (`isRealTime: true`, sem "ônibus fantasmas"), traçado viário contínuo (OSRM) e inversão rápida de sentido.
- 🔔 **Alerta de Descida por GPS & Alarme de Chegada**: Acompanha sua posição até o ponto de destino (~500 m e ~150 m) com som, vibração nativa e notificação.
- 📊 **Confiabilidade Histórica (7 dias)**: Mede desvio mediano de chegada e incidência de ônibus fantasmas por `linha + parada`, persistido em disco no BFF.
- 🤝 **Lotação & Relatos Colaborativos**: Votação de lotação em lote (`Vazio`, `Médio`, `Lotado`) e alertas comunitários (*Sem ar*, *Ônibus quebrado*, *Ponto inseguro à noite*) com expiração automática e persistência em disco.
- 📴 **Modo Offline Resiliente**: Catálogo de linhas da cidade, itinerários visitados, grade de partidas programadas (com destaque da próxima saída) e busca por rua/parada disponíveis mesmo sem internet.
- 🎨 **Design System "Mobilidade Vibrante"**: Identidade urbana de sinalização (`#c6f432` lime sobre grafite `#0e1116`), 100% em tokens semânticos claro/escuro ([DESIGN.md](DESIGN.md)), com code-splitting sob demanda do Leaflet.

---

## 🏗️ Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────┐
│     Frontend Web PWA & App Android (React 19 + Capacitor)    │
│    Vite 8 + Tailwind CSS v4 + Leaflet (lazy) + Lucide Icons  │
└──────────────────────────────┬───────────────────────────────┘
                               │ REST / JSON
┌──────────────────────────────▼───────────────────────────────┐
│              Nexto BFF Gateway (Node.js / Express 5)         │
│  - Decodificação nativa de Protocol Buffers (protobufjs)     │
│  - Planejador A→B e descoberta GTFS de paradas próximas      │
│  - Roteamento viário contínuo (OSRM) + multi-provider GTFS   │
│  - Histórico de confiabilidade (7d) e relatos persistidos    │
└──────────────────────────────┬───────────────────────────────┘
                               │ Protobuf Binário / GTFS
┌──────────────────────────────▼───────────────────────────────┐
│              Rede de Dados, OTP & Telemetria AVL             │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Como Executar Localmente

### 1. Instalar Dependências
```bash
npm install
npm --prefix client install
```

### 2. Construir o Frontend e Iniciar o BFF
```bash
npm run build:client
npm start
```

- **Interface Web / PWA:** `http://localhost:3001`
- **API REST Gateway:** `http://localhost:3001/api`
- **Health Check:** `http://localhost:3001/api/health`

### 3. Desenvolvimento com Hot Reload
```bash
# Terminal 1 — BFF na porta 3001
npm run dev:server

# Terminal 2 — Vite na porta 5173 (proxy automático para /api)
npm run dev:client
```

### 4. Build Mobile (Android via Capacitor)
```bash
npm --prefix client run build:mobile
npm --prefix client run cap:android
```

---

## 🧪 Testes Automatizados & Qualidade

O projeto segue **spec-first / TDD** usando `node:test` (lógica pura isolada em módulos `*Core.js`) e lint estrito com `oxlint` + regras do React Compiler:

```bash
# Executar toda a suíte (Backend + Frontend)
npm run test:all

# Apenas Backend (rotas, providers, persistência, OTP e paradas próximas)
npm test

# Apenas Frontend (utilitários puros e regras de domínio)
npm run test:client

# Lint estático (0 erros e 0 warnings)
npm run lint
```
