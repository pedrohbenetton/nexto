import { vibrateArrival } from './haptics';

// Sintetizador de Áudio e Notificações Táticas (Web Audio API - Sem arquivos externos)
class TransitAlarmSystem {
  constructor() {
    this.audioCtx = null;
    this.activeAlerts = new Map(); // vehicleId -> { thresholdSeconds, callback }
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Reproduz sinal sonoro tático de chegada (dois bips futuristas em frequência limpa)
  playArrivalChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Primeiro tom (Frequência 880Hz - A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Segundo tom (Frequência 1320Hz - E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.warn('Erro ao sintetizar áudio:', e);
    }
  }

  // Solicitar permissão de notificação
  async requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Disparar notificação e vibração
  triggerAlert({ vehicleId, minutes, seconds, stopName }) {
    // 1. Tocar sinal sonoro
    this.playArrivalChime();

    // 2. Vibrar dispositivo móvel (háptico nativo no app, Vibration API na web)
    vibrateArrival();

    // 3. Notificação do Sistema
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🚍 Ônibus #${vehicleId} se aproximando!`, {
          body: `Chegada em aprox. ${seconds <= 60 ? 'menos de 1 min' : `${minutes} min`} na parada: ${stopName}`,
          icon: '/icon.svg',
          badge: '/icon.svg',
          vibrate: [200, 100, 200, 100, 400],
          tag: `bus-arrival-${vehicleId}`,
          renotify: true
        });
      } catch (e) {
        console.warn('Falha ao instanciar notificação:', e);
      }
    }
  }
}

export const transitAlarm = new TransitAlarmSystem();
