import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export { buildShareUrl, buildShareMessage, parseShareParams } from './shareTripCore';

// Base pública dos links de acompanhamento. No app nativo a origem é local (https://localhost),
// então só há link quando VITE_PUBLIC_WEB_URL aponta para o site publicado.
export const PUBLIC_WEB_URL = import.meta.env?.VITE_PUBLIC_WEB_URL
  || (Capacitor.isNativePlatform() ? '' : window.location.origin);

// Abre a folha de compartilhamento do sistema; sem ela, cai para o WhatsApp.
// Retorna 'shared' | 'whatsapp' | 'cancelled'.
export async function shareTrip(text) {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title: 'Minha viagem no Nexto', text, dialogTitle: 'Compartilhar viagem' });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ text });
      return 'shared';
    }
  } catch (e) {
    if (e?.name === 'AbortError' || /cancel/i.test(e?.message || '')) return 'cancelled';
    console.warn('Falha no compartilhamento nativo, usando WhatsApp:', e);
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  return 'whatsapp';
}
