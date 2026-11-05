import React, { useState } from 'react';
import { X, ArrowUpDown, Route, Footprints, Clock, AlertCircle, ChevronRight, Bus } from 'lucide-react';
import { apiUrl } from '../utils/api';
import { tapFeedback } from '../utils/haptics';
import {
  buildTripPath, formatDuration, formatClock, summarizeItinerary, describeLeg
} from '../utils/tripPlanCore';
import PlaceInput from './PlaceInput';
import LinePlate from './LinePlate';
import TripRouteMap from './TripRouteMap';
import EmptyState from './EmptyState';

// Planejador de rota de A até B (com baldeação), via /api/trip
export default function TripPlannerModal({ isOpen, onClose, cityName }) {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [selected, setSelected] = useState(0);

  if (!isOpen) return null;

  const canSearch = Boolean(from && to) && !loading;

  const search = async () => {
    tapFeedback();
    setLoading(true);
    setError(null);
    setPlan(null);
    setSelected(0);
    try {
      const res = await fetch(apiUrl(buildTripPath({ from, to })));
      const json = await res.json();
      if (json.success) {
        setPlan(json.data);
      } else {
        setError(json.error || 'Não foi possível calcular a rota.');
      }
    } catch {
      setError('Falha de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setPlan(null);
  };

  const itineraries = plan?.itineraries || [];
  const current = itineraries[selected];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-scrim backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-surface border border-line sm:rounded-[24px] rounded-t-[24px] shadow-lift flex flex-col max-h-[92vh] overflow-hidden">

        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] bg-brand-soft flex items-center justify-center text-accent">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Planejar rota</h2>
              <p className="text-xs text-muted">De A até B, com baldeação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-[12px] text-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <PlaceInput label="Partida" value={from} onChange={setFrom} placeholder="Endereço ou local de partida" cityName={cityName} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={swap}
              aria-label="Inverter origem e destino"
              className="h-8 w-8 rounded-full border border-line bg-surface text-muted hover:text-ink flex items-center justify-center transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
          <PlaceInput label="Destino" value={to} onChange={setTo} placeholder="Para onde você vai?" cityName={cityName} />

          <button
            type="button"
            onClick={search}
            disabled={!canSearch}
            className="w-full h-11 rounded-[14px] bg-brand text-on-brand text-sm font-bold disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Buscando rotas...' : 'Buscar rotas'}
          </button>

          {error && (
            <EmptyState
              icon={AlertCircle}
              title="Não encontramos uma rota"
              description={error}
              actions={[{ label: 'Tentar novamente', onClick: search, primary: true }]}
            />
          )}

          {plan && itineraries.length === 0 && (
            <EmptyState
              icon={Route}
              title="Nenhuma rota por ônibus"
              description="Tente outro horário ou aproxime a partida e o destino de uma linha."
            />
          )}

          {itineraries.length > 0 && (
            <div className="space-y-2.5">
              {itineraries.map((it, idx) => {
                const sum = summarizeItinerary(it);
                const isSel = idx === selected;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelected(idx)}
                    aria-pressed={isSel}
                    className={`w-full text-left p-3.5 rounded-[16px] border transition-colors ${isSel ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-line-strong'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {sum.lines.map((code, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted" />}
                            <LinePlate line={{ routeCode: code }} size="sm" />
                          </React.Fragment>
                        ))}
                      </div>
                      <span className="font-display text-lg font-bold text-ink flex-shrink-0">{formatDuration(it.durationMin)}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatClock(it.startTime)} – {formatClock(it.endTime)}</span>
                      <span className="flex items-center gap-1"><Footprints className="w-3.5 h-3.5" />{sum.walkMin} min a pé</span>
                      <span className="flex items-center gap-1"><Bus className="w-3.5 h-3.5" />{sum.transfersLabel}</span>
                    </p>
                  </button>
                );
              })}

              {current && (
                <div className="space-y-3 pt-1">
                  <TripRouteMap itinerary={current} />
                  <ol className="space-y-2">
                    {current.legs.map((leg, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-ink">
                        {leg.isWalk
                          ? <Footprints className="w-4 h-4 mt-0.5 text-muted flex-shrink-0" />
                          : <LinePlate line={{ routeCode: leg.lineCode }} size="sm" />}
                        <div className="min-w-0">
                          <p className="font-semibold">{describeLeg(leg)}</p>
                          {!leg.isWalk && leg.from.name && (
                            <p className="text-xs text-muted truncate">Embarque: {leg.from.name}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
