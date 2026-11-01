import React, { useEffect, useRef, useState } from 'react';
import { X, MapPinned } from 'lucide-react';
import { watchPosition } from '../utils/geolocation';
import { distanceMeters, nextAlightState, formatDistance } from '../utils/alightCore';
import { transitAlarm } from '../utils/audioAlert';
import { vibrateArrival } from '../utils/haptics';
import LinePlate from './LinePlate';

const MESSAGES = {
  approaching: stop => ({ title: 'Prepare-se para descer', body: `Seu ponto está chegando: ${stop}` }),
  now: stop => ({ title: 'Desça agora!', body: `Você chegou em ${stop}` })
};

function notify(stage, stopName) {
  const { title, body } = MESSAGES[stage](stopName);
  transitAlarm.playArrivalChime();
  vibrateArrival();
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/icon.svg', tag: 'nexto-alight' });
    } catch {
      // Alguns WebViews não permitem Notification direto; o aviso visual + vibração já cobrem
    }
  }
}

// Faixa flutuante que acompanha o GPS até o ponto de descida e avisa ao se aproximar
export default function AlightAlert({ target, onCancel }) {
  const [stage, setStage] = useState('far');
  const [distance, setDistance] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const stageRef = useRef('far');

  useEffect(() => {
    transitAlarm.requestNotificationPermission();
    const stop = watchPosition(
      (fix) => {
        setGpsError(null);
        const d = distanceMeters(fix, target.stop);
        setDistance(d);
        const next = nextAlightState(stageRef.current, { distance: d, accuracy: fix.accuracy });
        if (next.notify) notify(next.notify, target.stop.name);
        stageRef.current = next.stage;
        setStage(next.stage);
      },
      () => setGpsError('Sem sinal de GPS')
    );
    return stop;
  }, [target]);

  const isNow = stage === 'now';

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed z-[60] left-4 right-4 bottom-[calc(5.5rem+var(--safe-bottom))] md:left-auto md:right-6 md:bottom-6 md:w-[380px]"
    >
      <div className={`rounded-[20px] p-3.5 pr-2 flex items-center gap-3 shadow-lift border ${
        isNow ? 'bg-brand text-on-brand border-brand' : 'bg-[#0e1116] text-white border-white/10'
      }`}>
        <LinePlate line={target.line} size="sm" />
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isNow ? 'text-on-brand/70' : 'text-white/60'}`}>
            {isNow ? 'Desça agora' : stage === 'approaching' ? 'Prepare-se para descer' : 'Aviso de descida ativo'}
          </p>
          <p className="font-display font-semibold text-[15px] leading-snug truncate">{target.stop.name}</p>
          <p className={`text-xs ${isNow ? 'text-on-brand/80' : 'text-white/70'} flex items-center gap-1`}>
            <MapPinned className="w-3.5 h-3.5" />
            {gpsError || (distance == null ? 'Localizando você...' : `a ${formatDistance(distance)}`)}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className={`h-10 px-3 rounded-full text-xs font-bold flex items-center gap-1 ${
            isNow ? 'bg-on-brand text-brand' : 'text-white/80 hover:bg-white/10'
          }`}
          aria-label={isNow ? 'Cheguei, encerrar aviso' : 'Cancelar aviso de descida'}
        >
          {isNow ? 'Cheguei' : <X className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
