const cittaProvider = require('./CittamobiProvider');
const gtfsProvider = require('./GTFSRealtimeProvider');

class ProviderRegistry {
  constructor() {
    this.providers = {
      cittamobi: cittaProvider,
      gtfs: gtfsProvider
    };
  }

  getProviderForCity(cityId) {
    const id = parseInt(cityId);
    // IDs acima de 9000 são reservados para feeds GTFS municipais abertos diretos
    if (id >= 9000) {
      return this.providers.gtfs;
    }
    return this.providers.cittamobi;
  }

  getProviderForLine(linePath) {
    if (linePath && linePath.startsWith('gtfs-')) {
      return this.providers.gtfs;
    }
    return this.providers.cittamobi;
  }

  async searchCitiesAcrossAll(query) {
    const [cittaCities, gtfsCities] = await Promise.all([
      this.providers.cittamobi.searchCities(query).catch(() => []),
      this.providers.gtfs.searchCities(query).catch(() => [])
    ]);
    return [...gtfsCities, ...cittaCities];
  }
}

module.exports = new ProviderRegistry();
