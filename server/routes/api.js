const express = require('express');
const router = express.Router();
const citta = require('../cittamobiService');
const crowding = require('../crowdingRegistry');
const providerRegistry = require('../providers/ProviderRegistry');
const nearbyStops = require('../nearbyStops');

// Rota Raiz da API (/api)
router.get('/', (req, res) => {
  res.json({
    service: 'Nexto API Gateway',
    version: '1.3.0',
    status: 'online',
    webAppUrl: 'http://localhost:3001',
    description: 'BFF soberano de alta velocidade para transporte público em tempo real sem anúncios.',
    endpoints: {
      health: '/api/health',
      cities: '/api/cities?q={nome}',
      cityDetect: '/api/cities/detect?lat={lat}&lng={lng}',
      cityLines: '/api/cities/{cityId}/lines',
      lineDetails: '/api/lines/details?path={lineRoutesPath}',
      lineTracking: '/api/lines/tracking?path={lineRoutesPath}&serviceId={serviceId}&cityId={cityId}',
      linePaired: '/api/lines/paired?routeCode={code}&cityId={cityId}',
      predictions: '/api/predictions?serviceId={serviceId}&stopId={stopId}',
      autocomplete: '/api/autocomplete?term={termo}',
      placeResolve: '/api/places/resolve?text={termo}&key={id}',
      stopsNearby: '/api/stops/nearby?lat={lat}&lng={lng}&radius={metros}'
    }
  });
});

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Nexto Sovereign BFF',
    timestamp: new Date().toISOString()
  });
});

// 1. Busca de Cidades Multi-Provedor (Cittamobi + Feeds GTFS Abertos)
router.get('/cities', async (req, res) => {
  try {
    const query = req.query.q || req.query.name || '';
    if (!query.trim()) {
      return res.status(400).json({ error: 'Parâmetro de busca "q" obrigatório' });
    }
    const cities = await providerRegistry.searchCitiesAcrossAll(query);
    res.json({ success: true, count: cities.length, data: cities });
  } catch (error) {
    console.error('Erro ao buscar cidades:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 1.5. Detectar Cidade por Coordenadas GPS do Usuário
router.get('/cities/detect', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat e lng são obrigatórios' });
    }
    const axios = require('axios');
    const response = await axios.get(`https://api.cittamobi.com.br/session/start?lat=${lat}&lng=${lng}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000
    });
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Linhas de uma cidade por ID (Roteamento Dinâmico de Provedor)
router.get('/cities/:cityId/lines', async (req, res) => {
  try {
    const { cityId } = req.params;
    if (!cityId) {
      return res.status(400).json({ error: 'cityId obrigatório' });
    }
    const provider = providerRegistry.getProviderForCity(cityId);
    const lines = await provider.getLines(cityId);
    
    // Suporte a filtro de texto opcional
    const filter = (req.query.search || '').toLowerCase().trim();
    let filteredLines = lines;
    if (filter) {
      filteredLines = lines.filter(l => 
        (l.routeCode && l.routeCode.toLowerCase().includes(filter)) ||
        (l.routeMnemonic && l.routeMnemonic.toLowerCase().includes(filter)) ||
        (l.serviceMnemonic && l.serviceMnemonic.toLowerCase().includes(filter))
      );
    }

    res.json({ success: true, count: filteredLines.length, total: lines.length, provider: provider.name, data: filteredLines });
  } catch (error) {
    console.error('Erro ao listar linhas:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Detalhes de uma linha (paradas, itinerário, serviceId)
router.get('/lines/details', async (req, res) => {
  try {
    const { path } = req.query;
    if (!path) {
      return res.status(400).json({ error: 'Parâmetro "path" (lineRoutesPath) obrigatório' });
    }
    const provider = providerRegistry.getProviderForLine(path);
    const details = await provider.getLineDetails(path);
    res.json({ success: true, provider: provider.name, data: details });
  } catch (error) {
    console.error('Erro ao obter detalhes da linha:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3.5. Rastreamento em Tempo Real dos Ônibus da Linha (Posições GPS & Paradas & Estatísticas de Telemetria)
router.get('/lines/tracking', async (req, res) => {
  try {
    const { path, serviceId, cityId } = req.query;
    if (!path) {
      return res.status(400).json({ error: 'Parâmetro "path" (lineRoutesPath) obrigatório' });
    }
    const provider = providerRegistry.getProviderForLine(path);
    const tracking = await provider.getLineTracking(path, serviceId, cityId ? parseInt(cityId) : 35);
    
    // Análise de telemetria e headway (intervalo médio entre veículos)
    let avgHeadwayMinutes = null;
    if (tracking.vehicles && tracking.vehicles.length >= 2) {
      const sorted = [...tracking.vehicles].sort((a, b) => a.secondsUntilArrival - b.secondsUntilArrival);
      let totalDiff = 0;
      let count = 0;
      for (let i = 1; i < sorted.length; i++) {
        const diff = Math.abs(sorted[i].secondsUntilArrival - sorted[i-1].secondsUntilArrival);
        if (diff > 0) {
          totalDiff += diff;
          count++;
        }
      }
      if (count > 0) {
        avgHeadwayMinutes = Math.round((totalDiff / count) / 60);
      }
    }

    tracking.telemetrySummary = {
      activeFleet: tracking.vehicles ? tracking.vehicles.length : 0,
      realtimeFleet: tracking.vehicles ? tracking.vehicles.filter(v => v.isRealTime).length : 0,
      estimatedHeadwayMinutes: avgHeadwayMinutes || 15
    };

    res.json({ success: true, provider: provider.name, data: tracking });
  } catch (error) {
    console.error('Erro no rastreamento de veículos:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Previsões em tempo real
router.get('/predictions', async (req, res) => {
  try {
    const { serviceId, stopId } = req.query;
    if (!serviceId || !stopId) {
      return res.status(400).json({ error: 'serviceId e stopId são obrigatórios' });
    }
    const predictions = await citta.getStopPredictions(serviceId, stopId);
    res.json({ success: true, data: predictions });
  } catch (error) {
    console.error('Erro ao buscar previsões:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Autocomplete de endereços e paradas
router.get('/autocomplete', async (req, res) => {
  try {
    const { term, lat, lng } = req.query;
    if (!term || !term.trim()) {
      return res.status(400).json({ error: 'term obrigatório' });
    }
    const places = await citta.autocompletePlaces(term, lat, lng);
    res.json({ success: true, count: places.length, data: places });
  } catch (error) {
    console.error('Erro no autocomplete:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5.5. Resolução de Coordenadas Geográficas de Locais/Paradas
router.get('/places/resolve', async (req, res) => {
  try {
    const { text, key } = req.query;
    if (!text || !key) {
      return res.status(400).json({ error: 'text e key são obrigatórios' });
    }
    const location = await citta.resolvePlace(text, key);
    res.json({ success: true, data: location });
  } catch (error) {
    console.error('Erro ao resolver local:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5.8. Paradas Próximas por Raio Geográfico (GPS)
router.get('/stops/nearby', (req, res) => {
  try {
    const { lat, lng, radius, limit } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat e lng são obrigatórios' });
    }
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxRadius = radius ? parseInt(radius) : 2500;
    const maxLimit = limit ? parseInt(limit) : 8;

    const stops = nearbyStops.findNearbyStops(userLat, userLng, maxRadius, maxLimit);
    res.json({ success: true, count: stops.length, data: stops });
  } catch (error) {
    console.error('Erro ao buscar paradas próximas:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Linhas Pareadas por Código de Rota (Alternância Bairro / Centro / Garagem)
router.get('/lines/paired', async (req, res) => {
  try {
    const { routeCode, cityId } = req.query;
    if (!routeCode || !cityId) {
      return res.status(400).json({ error: 'routeCode e cityId são obrigatórios' });
    }
    const provider = providerRegistry.getProviderForCity(cityId);
    const allLines = await provider.getLines(parseInt(cityId));
    const targetCode = String(routeCode).trim().toLowerCase();
    
    // Filtra todas as variações daquela rota
    const paired = allLines.filter(l => 
      l.routeCode && String(l.routeCode).trim().toLowerCase() === targetCode
    );

    res.json({ success: true, count: paired.length, data: paired });
  } catch (error) {
    console.error('Erro ao buscar linhas pareadas:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Telemetria de Lotação Colaborativa (Crowdsourcing)
router.post('/crowding/report', (req, res) => {
  try {
    const { vehicleId, level } = req.body;
    if (!vehicleId || !level) {
      return res.status(400).json({ error: 'vehicleId e level (low|medium|high) são obrigatórios' });
    }
    crowding.addReport(String(vehicleId), level);
    const updated = crowding.getCrowding(String(vehicleId));
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/crowding/:vehicleId', (req, res) => {
  try {
    const { vehicleId } = req.params;
    const status = crowding.getCrowding(String(vehicleId));
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
