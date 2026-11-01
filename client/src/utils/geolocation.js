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

const WATCH_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 };
const toFix = pos => ({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });

// Acompanha a posição continuamente (app aberto). Retorna uma função que encerra o acompanhamento.
export function watchPosition(onFix, onError) {
  if (Capacitor.isNativePlatform()) {
    let id = null;
    let stopped = false;
    (async () => {
      try {
        const { location } = await Geolocation.checkPermissions();
        if (location !== 'granted') {
          const req = await Geolocation.requestPermissions({ permissions: ['location'] });
          if (req.location !== 'granted') throw new Error('Permissão de localização negada.');
        }
        if (stopped) return;
        id = await Geolocation.watchPosition(WATCH_OPTIONS, (pos, err) => {
          if (err || !pos) onError?.(err);
          else onFix(toFix(pos));
        });
      } catch (err) {
        onError?.(err);
      }
    })();
    return () => {
      stopped = true;
      if (id) Geolocation.clearWatch({ id });
    };
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.(new Error('Geolocalização não suportada neste dispositivo.'));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(pos => onFix(toFix(pos)), onError, WATCH_OPTIONS);
  return () => navigator.geolocation.clearWatch(id);
}
