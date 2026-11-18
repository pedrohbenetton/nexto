import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../utils/api';
import { getCurrentPosition } from '../utils/geolocation';
import { tapFeedback } from '../utils/haptics';
import {
  buildNearbyStopsPath,
  formatDistance,
  stopSubtitle,
  lineDestinationLabel,
  resolveStopLineSelection
} from '../utils/nearbyStopsCore';
import { X, Navigation, MapPin, Footprints, Clock, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import { StopListSkeleton } from './Skeleton';
import LinePlate from './LinePlate';
import EmptyState from './EmptyState';

const INITIAL_VISIBLE_LINES = 5;

export default function NearbyStopsModal({
  isOpen,
  onClose,
  cityId = 35,
  lines = [],
  onSelectLineStop,
  onSelectStop
}) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedStops, setExpandedStops] = useState({});

  const loadNearby = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { lat, lng } = await getCurrentPosition();
      const path = buildNearbyStopsPath({ lat, lng, cityId, radius: 2500, limit: 10 });
      const res = await fetch(apiUrl(path));
      const json = await res.json();
      if (json.success) {
        setStops(json.data || []);
      } else {
        setError(json.error || 'Não foi possível consultar os pontos próximos.');
      }
    } catch (err) {
      if (err?.code === 'UNSUPPORTED') {
        setError('Geolocalização não suportada neste dispositivo.');
      } else if (err?.code === 'DENIED' || err?.code === 'UNAVAILABLE') {
        setError('Permissão de localização negada ou sinal de GPS indisponível.');
      } else {
        setError('Sem conexão para consultar os pontos próximos agora.');
      }
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { lat, lng } = await getCurrentPosition();
        if (!active) return;
        const path = buildNearbyStopsPath({ lat, lng, cityId, radius: 2500, limit: 10 });
        const res = await fetch(apiUrl(path));
        const json = await res.json();
        if (!active) return;
        if (json.success) {
          setStops(json.data || []);
        } else {
          setError(json.error || 'Não foi possível consultar os pontos próximos.');
        }
      } catch (err) {
        if (!active) return;
        if (err?.code === 'UNSUPPORTED') {
          setError('Geolocalização não suportada neste dispositivo.');
        } else if (err?.code === 'DENIED' || err?.code === 'UNAVAILABLE') {
          setError('Permissão de localização negada ou sinal de GPS indisponível.');
        } else {
          setError('Sem conexão para consultar os pontos próximos agora.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [isOpen, cityId]);

  if (!isOpen) return null;

  const handlePickLine = (stop, stopLine) => {
    tapFeedback();
    const { line, stopId } = resolveStopLineSelection(stop, stopLine, lines);
    if (onSelectLineStop) {
      onSelectLineStop(line, stopId);
    }
    onClose();
  };

  const toggleExpand = (key) => {
    setExpandedStops(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-scrim backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-surface border-t sm:border border-line rounded-t-[28px] sm:rounded-[28px] flex flex-col max-h-[90vh] overflow-hidden pb-safe sm:pb-0">

        {/* Header */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3 bg-surface">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-[12px] bg-brand-soft flex items-center justify-center text-accent flex-shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-ink truncate">
                Perto de mim
              </h2>
              <p className="text-xs text-muted truncate">
                Toque numa linha para abrir direto neste ponto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={loadNearby}
              disabled={loading}
              aria-label="Atualizar localização"
              className="h-10 px-3 rounded-full border border-line hover:border-line-strong text-xs font-semibold text-ink flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-accent ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="w-10 h-10 rounded-full text-muted hover:text-ink hover:bg-surface-2 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista de pontos próximos */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-canvas">
          {loading && (
            <StopListSkeleton count={5} label="Localizando pontos e linhas ao seu redor..." />
          )}

          {!loading && error && (
            <EmptyState
              icon={AlertCircle}
              title="Não conseguimos localizar os pontos"
              description={error}
              actions={[{ label: 'Tentar novamente', onClick: loadNearby, primary: true }]}
            />
          )}

          {!loading && !error && stops.length === 0 && (
            <EmptyState
              icon={MapPin}
              title="Nenhum ponto encontrado por perto"
              description="Não encontramos paradas com linhas ativas num raio de 2,5 km da sua posição."
              actions={[{ label: 'Atualizar localização', onClick: loadNearby, primary: true }]}
            />
          )}

          {!loading && !error && stops.length > 0 && stops.map((stop, idx) => {
            const stopKey = stop.stopId || `${stop.lat}-${stop.lng}-${idx}`;
            const subtitle = stopSubtitle(stop);
            const stopLines = Array.isArray(stop.lines) ? stop.lines : [];
            const isExpanded = Boolean(expandedStops[stopKey]);
            const visibleLines = isExpanded ? stopLines : stopLines.slice(0, INITIAL_VISIBLE_LINES);
            const hiddenCount = stopLines.length - visibleLines.length;

            return (
              <article
                key={stopKey}
                className="rounded-[20px] bg-surface border border-line p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 w-8 h-8 rounded-[10px] bg-surface-2 border border-line flex items-center justify-center text-accent flex-shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-bold text-ink leading-snug">
                        {stop.name}
                      </h3>
                      {subtitle && (
                        <p className="mt-0.5 text-xs text-muted truncate">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                    <span className="text-xs font-bold text-accent bg-brand-soft px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Footprints className="w-3 h-3" />
                      {formatDistance(stop.distanceMeters)}
                    </span>
                    <span className="text-[11px] text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3 text-faint" />
                      ~{stop.walkTimeMinutes} min a pé
                    </span>
                  </div>
                </div>

                {stopLines.length > 0 ? (
                  <div className="space-y-1.5 pt-1 border-t border-line">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {stopLines.length === 1 ? '1 linha passa aqui' : `${stopLines.length} linhas passam aqui`}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {visibleLines.map((line) => (
                        <button
                          key={line.lineRoutesPath || `${line.routeCode}-${line.serviceMnemonic}`}
                          type="button"
                          onClick={() => handlePickLine(stop, line)}
                          className="min-h-[40px] w-full px-3 py-1.5 rounded-[14px] bg-canvas hover:bg-surface-2 border border-line hover:border-line-strong flex items-center justify-between gap-2.5 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <LinePlate line={line} size="sm" />
                            <span className="text-xs font-semibold text-ink truncate">
                              {lineDestinationLabel(line)}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(stopKey)}
                        className="min-h-[36px] w-full rounded-full border border-line hover:border-line-strong text-xs font-semibold text-accent transition-colors"
                      >
                        Mostrar mais {hiddenCount} {hiddenCount === 1 ? 'linha' : 'linhas'}
                      </button>
                    )}
                    {isExpanded && stopLines.length > INITIAL_VISIBLE_LINES && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(stopKey)}
                        className="min-h-[36px] w-full rounded-full border border-line hover:border-line-strong text-xs font-semibold text-muted hover:text-ink transition-colors"
                      >
                        Mostrar menos
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">Linhas ainda não mapeadas neste ponto</span>
                    {onSelectStop && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStop(stop);
                          onClose();
                        }}
                        className="h-9 px-3 rounded-full border border-line hover:border-line-strong text-xs font-semibold text-ink transition-colors"
                      >
                        Buscar endereço
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
