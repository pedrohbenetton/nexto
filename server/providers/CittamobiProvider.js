const BaseTransitProvider = require('./BaseTransitProvider');
const cittaService = require('../cittamobiService');

class CittamobiProvider extends BaseTransitProvider {
  constructor() {
    super('Cittamobi');
  }

  async searchCities(query) {
    return await cittaService.searchCities(query);
  }

  async getLines(cityId) {
    return await cittaService.getLinesByCityId(cityId);
  }

  async getLineDetails(linePath) {
    return await cittaService.getLineDetails(linePath);
  }

  async getLineTracking(linePath, serviceId, cityId) {
    return await cittaService.getLineTracking(linePath, serviceId, cityId);
  }

  async getStopPredictions(serviceId, stopId) {
    return await cittaService.getStopPredictions(serviceId, stopId);
  }

  async autocompletePlaces(term, lat, lng) {
    return await cittaService.autocompletePlaces(term, lat, lng);
  }
}

module.exports = new CittamobiProvider();
