# 🚍 Nexto - Modern & Ad-Free Real-Time Transit System

> **Nexto** é uma plataforma moderna, ultrarrápida, mobile-first e **100% livre de anúncios** para rastreamento de transporte público em tempo real, com decodificação nativa de Protocol Buffers e traçados asfálticos contínuos.

---

## ⚡ Recursos Principais

- 🛰️ **Radar de Ônibus ao Vivo no Mapa**: Visualização de veículos que estão *estritamente em circulação* com telemetria ativa via satélite (sem ônibus fantasmas).
- 🎨 **Design Moderno & Científico**: Interface inspirada nos padrões visuais do Calendly e Linear (`#0b3558`, `#006bff`, `#ffffff`), limpa, sem poluição visual ou banners publicitários.
- 🚫 **100% Livre de Anúncios**: Experiência fluida, instantânea e com economia de bateria e franquia de dados móveis.
- ⏱️ **Previsões em Tempo Real (ETA)**: Contadores decrescentes de chegada atualizados com telemetria de satélite e auto-refresh a cada 12 segundos.
- 🗺️ **Cartografia de Alta Precisão (OSRM / OpenStreetMap)**: Roteirização contínua sobre as vias asfálticas reais, eliminando retornos desnecessários e desvios incorretos.
- 🇧🇷 **Cobertura Ampla**: Acesso ao catálogo de linhas e horários de transporte público.
- ⭐ **Favoritos Offline & PWA**: Instale no celular como aplicativo nativo e acesse suas linhas favoritas mesmo sem internet.

---

## 🏗️ Arquitetura do Sistema

```
┌────────────────────────────────────────────────────────┐
│             Frontend Web PWA (React + Leaflet)         │
│           Vite + Tailwind CSS + Lucide Icons           │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON
┌───────────────────────────▼────────────────────────────┐
│            Nexto BFF Gateway (Node.js / Express)       │
│  - Decodificação dinâmica de Protocol Buffers          │
│  - Roteamento viário asfáltico contínuo (OSRM)         │
│  - Mapeamento sequencial de paradas                    │
│  - Filtro estrito de telemetria ativa (isRealTime)     │
│  - Cache inteligente de baixo custo de I/O             │
└───────────────────────────┬────────────────────────────┘
                            │ Protobuf Binário (HTTPS)
┌───────────────────────────▼────────────────────────────┐
│            Rede de Dados e Telemetria AVL              │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Como Executar Localmente

### 1. Instalar Dependências
```bash
# Na raiz
npm install

# No cliente
npm --prefix client install
```

### 2. Construir o Frontend
```bash
npm --prefix client run build
```

### 3. Iniciar o Servidor
```bash
npm start
```

* **Interface Visual (Web / PWA):** [http://localhost:3001](http://localhost:3001)
* **API REST Gateway:** [http://localhost:3001/api](http://localhost:3001/api)
* **Status do Sistema:** [http://localhost:3001/api/health](http://localhost:3001/api/health)
