import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { createLocator } from './geolocationCore';

export { GeoError } from './geolocationCore';

// GPS nativo no app (Capacitor) e navigator.geolocation na web.
// Resolve { lat, lng, accuracy } ou rejeita com GeoError (UNSUPPORTED | DENIED | UNAVAILABLE).
export const getCurrentPosition = createLocator({
  isNative: Capacitor.isNativePlatform(),
  native: Geolocation,
  browser: typeof navigator !== 'undefined' ? navigator.geolocation : undefined
});
