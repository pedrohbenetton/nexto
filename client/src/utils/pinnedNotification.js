import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { buildPinnedNotification, pinnedNotificationId } from './pinnedNotificationCore';

export const canPinNotifications = () => Capacitor.isNativePlatform();

// Mostra ou atualiza (mesmo id substitui) a notificação fixa do ponto
export async function updatePinned(entry, arrivals) {
  if (!canPinNotifications()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const asked = await LocalNotifications.requestPermissions();
      if (asked.display !== 'granted') return false;
    }
    await LocalNotifications.schedule({ notifications: [buildPinnedNotification(entry, arrivals)] });
    return true;
  } catch (e) {
    console.warn('Falha ao fixar notificação:', e);
    return false;
  }
}

export async function clearPinned(entry) {
  if (!canPinNotifications()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: pinnedNotificationId(entry) }] });
  } catch (e) {
    console.warn('Falha ao remover notificação:', e);
  }
}
