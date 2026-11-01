import React, { useEffect, useState } from 'react';
import { BookmarkX, MapPin } from 'lucide-react';
import { apiUrl } from '../utils/api';
import { savedStopKey, upcomingArrivals } from '../utils/savedStops';
import LinePlate from './LinePlate';
import { SkeletonBlock } from './Skeleton';

const REFRESH_MS = 20000;

// Previsões ao vivo de cada ponto salvo; pausa quando o app vai para segundo plano
function useStopDepartures(savedStops) {
  const [departures, setDepartures] = useState({});
  const keys = savedStops.map(savedStopKey).join('|');

  useEffect(() => {
    if (savedStops.length === 0) return undefined;
    let cancelled = false;

    const load = () => {
      if (document.visibilityState === 'hidden') return;
      savedStops.forEach(async (entry) => {
        const key = savedStopKey(entry);
        try {
          const res = await fetch(apiUrl(
            `/api/predictions?serviceId=${encodeURIComponent(entry.serviceId)}&stopId=${encodeURIComponent(entry.stopId)}`
          ));
          const json = await res.json();
          if (cancelled) return;
          setDepartures(prev => ({
            ...prev,
            [key]: json.success
              ? { status: 'ok', arrivals: upcomingArrivals(json.data, 3) }
              : { status: 'error', arrivals: prev[key]?.arrivals || [] }
          }));
        } catch {
          if (!cancelled) {
            setDepartures(prev => ({ ...prev, [key]: { status: 'error', arrivals: prev[key]?.arrivals || [] } }));
          }
        }
      });
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
    // keys resume a lista salva; evita refazer o efeito a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);

  return departures;
}

function Arrivals({ state }) {
  if (!state) {
    return (
      <div className="flex flex-col items-end gap-1.5" aria-hidden="true">
        <SkeletonBlock className="h-7 w-16 rounded-[8px]" />
        <SkeletonBlock className="h-3 w-20 rounded-full" />
      </div>
    );
  }

  const [next, ...later] = state.arrivals;
  if (!next) {
    return (
      <p className="text-xs font-semibold text-muted text-right leading-tight max-w-[96px]">
        {state.status === 'error' ? 'Sem conexão' : 'Sem ônibus previsto'}
      </p>
    );
  }

  return (
    <div className="text-right">
      <p className="flex items-center justify-end gap-1.5">
        {next.isRealTime && (
          <span className="relative flex w-2 h-2" title="Posição ao vivo (GPS)">
            <span className="absolute inset-0 rounded-full bg-success opacity-60 animate-ping" />
            <span className="relative w-2 h-2 rounded-full bg-success" />
          </span>
        )}
        <span className={`font-display font-bold leading-none ${next.label === 'Agora' ? 'text-signal text-xl' : 'text-ink text-2xl'}`}>
          {next.label}
        </span>
      </p>
      {later.length > 0 && (
        <p className="mt-1 text-[11px] text-muted">
          depois {later.map(a => a.label).join(' · ')}
        </p>
      )}
    </div>
  );
}

export default function MyStops({ savedStops, onOpen, onRemove }) {
  const departures = useStopDepartures(savedStops);

  return (
    <section className="space-y-2.5" aria-labelledby="my-stops-title">
      <div className="flex items-center justify-between">
        <h2 id="my-stops-title" className="font-display text-base font-bold text-ink flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted" />
          Meus pontos
        </h2>
        <span className="text-xs text-muted">atualiza a cada 20s</span>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {savedStops.map((entry) => {
          const key = savedStopKey(entry);
          return (
            <li key={key} className="relative">
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className="w-full text-left bg-surface border border-line hover:border-line-strong rounded-[20px] p-3.5 pr-11 flex items-center gap-3.5 transition-colors"
              >
                <LinePlate line={entry.line} />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-[15px] text-ink leading-snug line-clamp-2">
                    {entry.stopName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted truncate">
                    {entry.line.routeMnemonic}
                    {entry.line.serviceMnemonic && ` → ${entry.line.serviceMnemonic}`}
                  </p>
                </div>
                <Arrivals state={departures[key]} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full text-faint hover:text-ink hover:bg-surface-2 flex items-center justify-center"
                aria-label={`Remover ponto ${entry.stopName} da linha ${entry.line.routeCode}`}
                title="Remover dos meus pontos"
              >
                <BookmarkX className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
