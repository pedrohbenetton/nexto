import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const WEB_ARRIVAL_PATTERN = [200, 100, 200, 100, 400];

// Vibração de "ônibus chegando": motor háptico nativo no app, Vibration API na web
export async function vibrateArrival() {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Warning });
      await Haptics.vibrate({ duration: 400 });
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(WEB_ARRIVAL_PATTERN);
    }
  } catch (e) {
    console.warn('Falha ao vibrar:', e);
  }
}

// Toque curto de confirmação (ex.: ao ativar o alarme)
export async function tapFeedback() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    console.warn('Falha no feedback háptico:', e);
  }
}
