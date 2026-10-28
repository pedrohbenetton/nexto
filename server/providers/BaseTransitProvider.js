/**
 * Base Transit Provider Interface (Contrato Padronizado)
 * Qualquer fonte de dados (Cittamobi, GTFS-RT, SPTrans Olho Vivo, Dados.rio)
 * implementa esta interface para garantir soberania e intercambialidade.
 */
class BaseTransitProvider {
  constructor(name) {
    this.name = name;
  }

  async searchCities(query) {
    throw new Error(`${this.name}: searchCities not implemented`);
  }

  async getLines(cityId) {
    throw new Error(`${this.name}: getLines not implemented`);
  }

  async getLineDetails(linePath) {
    throw new Error(`${this.name}: getLineDetails not implemented`);
  }

  async getLineTracking(linePath, serviceId, cityId) {
    throw new Error(`${this.name}: getLineTracking not implemented`);
  }

  async getStopPredictions(serviceId, stopId) {
    throw new Error(`${this.name}: getStopPredictions not implemented`);
  }

  async autocompletePlaces(term, lat, lng) {
    throw new Error(`${this.name}: autocompletePlaces not implemented`);
  }
}

module.exports = BaseTransitProvider;
