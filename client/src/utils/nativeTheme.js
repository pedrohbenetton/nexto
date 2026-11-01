import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { statusBarFor } from './nativeThemeCore';

async function apply(isDark) {
  const { style, backgroundColor } = statusBarFor(isDark);
  try {
    await StatusBar.setStyle({ style });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: backgroundColor });
    }
  } catch (e) {
    console.warn('Falha ao estilizar a status bar:', e);
  }
}

// Mantém a status bar do app nativo alinhada ao tema claro/escuro do sistema
export function syncStatusBarWithTheme() {
  if (!Capacitor.isNativePlatform() || !window.matchMedia) return;
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  apply(query.matches);
  query.addEventListener('change', (e) => apply(e.matches));
}
