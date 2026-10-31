// Lógica de geolocalização independente de plataforma (testável sem Capacitor/navegador)
export class GeoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GeoError';
    this.code = code; // 'UNSUPPORTED' | 'DENIED' | 'UNAVAILABLE'
  }
}

const toCoords = pos => ({
  lat: pos.coords.latitude,
  lng: pos.coords.longitude,
  accuracy: pos.coords.accuracy
});

async function locateNative(native, options) {
  let { location } = await native.checkPermissions();
  if (location !== 'granted') {
    ({ location } = await native.requestPermissions({ permissions: ['location'] }));
  }
  if (location !== 'granted') {
    throw new GeoError('DENIED', 'Permissão de localização negada.');
  }
  try {
    return toCoords(await native.getCurrentPosition(options));
  } catch (err) {
    throw new GeoError('UNAVAILABLE', err?.message || 'Sinal de GPS indisponível.');
  }
}

function locateBrowser(browser, options) {
  if (!browser) {
    return Promise.reject(new GeoError('UNSUPPORTED', 'Geolocalização não suportada neste dispositivo.'));
  }
  return new Promise((resolve, reject) => {
    browser.getCurrentPosition(
      pos => resolve(toCoords(pos)),
      err => reject(err?.code === 1
        ? new GeoError('DENIED', 'Permissão de localização negada.')
        : new GeoError('UNAVAILABLE', 'Sinal de GPS indisponível.')),
      options
    );
  });
}

export function createLocator({ isNative, native, browser }) {
  return (options = { enableHighAccuracy: true, timeout: 8000 }) =>
    isNative ? locateNative(native, options) : locateBrowser(browser, options);
}
