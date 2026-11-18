import React, { useState, lazy, Suspense } from 'react';
import {
  X, ArrowUpDown, Route, Footprints, Clock, AlertCircle,
  ChevronRight, Bus, Home, Briefcase, Plus
} from 'lucide-react';
import { apiUrl } from '../utils/api';
import { tapFeedback } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';
import {
  buildTripPath, resolveTripTime, formatDuration, formatClock,
  summarizeItinerary, describeLeg, matchLegToCatalogLine
} from '../utils/tripPlanCore';
import {
  PLACE_SLOTS,
  canSavePlaceCandidate,
  setSavedPlace,
  clearSavedPlace,
  loadSavedPlaces,
  storeSavedPlaces
} from '../utils/savedPlacesCore';
import PlaceInput from './PlaceInput';
import LinePlate from './LinePlate';
import EmptyState from './EmptyState';

const TripRouteMap = lazy(() => import('./TripRouteMap'));

const SLOT_ICONS = {
  home: Home,
  work: Briefcase
};

// Planejador de rota de A até B (com baldeação, atalhos Casa/Trabalho e abertura ao vivo da linha), via /api/trip
export default function TripPlannerModal({ isOpen, onClose, cityName, cityCoords, lines = [], onOpenLineStop }) {
  useEscapeKey(onClose, isOpen);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [activeField, setActiveField] = useState('to');
  const [savedPlaces, setSavedPlaces] = useState(loadSavedPlaces);
  const [slotHint, setSlotHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [selected, setSelected] = useState(0);
  const [timeMode, setTimeMode] = useState('now');
  const [clock, setClock] = useState('');

  if (!isOpen) return null;

  const timeOk = timeMode === 'now' || Boolean(clock);
  const canSearch = Boolean(from && to) && timeOk && !loading;

  const primaryVal = activeField === 'from' ? from : to;
  const saveCandidate = canSavePlaceCandidate(primaryVal)
    ? primaryVal
    : canSavePlaceCandidate(to)
      ? to
      : canSavePlaceCandidate(from)
        ? from
        : null;

  const handleUseSlot = (slotId, label) => {
    tapFeedback();
    const saved = savedPlaces[slotId];
    if (saved) {
      setSlotHint(null);
      setPlan(null);
      if (activeField === 'from' || (!from && to)) {
        setFrom(saved);
      } else {
        setTo(saved);
      }
      return;
    }

    if (saveCandidate) {
      const next = setSavedPlace(savedPlaces, slotId, saveCandidate);
      setSavedPlaces(next);
      storeSavedPlaces(next);
      setSlotHint(`${label} salvo como "${saveCandidate.name}".`);
    } else {
      setSlotHint(`Escolha um endereço na partida ou destino para salvar como ${label}.`);
    }
  };

  const handleClearSlot = (slotId) => {
    tapFeedback();
    const next = clearSavedPlace(savedPlaces, slotId);
    setSavedPlaces(next);
    storeSavedPlaces(next);
    setSlotHint(null);
  };

  const search = async () => {
    tapFeedback();
    setLoading(true);
    setError(null);
    setPlan(null);
    setSelected(0);
    try {
      const res = await fetch(apiUrl(buildTripPath({ from, to, ...resolveTripTime({ mode: timeMode, clock }) })));
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
      <div className="w-full max-w-lg bg-surface border-t sm:border border-line sm:rounded-[28px] rounded-t-[28px] flex flex-col max-h-[92vh] overflow-hidden pb-safe sm:pb-0">

        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-brand-soft flex items-center justify-center text-accent">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Planejar rota</h2>
              <p className="text-xs text-muted">De A até B, com baldeação e ônibus ao vivo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full text-muted hover:text-ink hover:bg-surface-2 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <PlaceInput
            label="Partida"
            value={from}
            onChange={(v) => { setFrom(v); setSlotHint(null); }}
            onActivate={() => setActiveField('from')}
            placeholder="Endereço ou local de partida"
            cityName={cityName}
            cityCoords={cityCoords}
          />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={swap}
              aria-label="Inverter origem e destino"
              className="h-9 w-9 rounded-full border border-line bg-surface text-muted hover:text-ink flex items-center justify-center transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
          <PlaceInput
            label="Destino"
            value={to}
            onChange={(v) => { setTo(v); setSlotHint(null); }}
            onActivate={() => setActiveField('to')}
            placeholder="Para onde você vai?"
            cityName={cityName}
            cityCoords={cityCoords}
          />

          {/* Atalhos rápidos: Casa e Trabalho */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {PLACE_SLOTS.map(({ id, label }) => {
                const Icon = SLOT_ICONS[id];
                const saved = savedPlaces[id];
                return (
                  <div
                    key={id}
                    className="inline-flex items-center h-9 rounded-full border border-line bg-surface-2 overflow-hidden max-w-full"
                  >
                    <button
                      type="button"
                      onClick={() => handleUseSlot(id, label)}
                      className="h-full px-3 flex items-center gap-1.5 text-xs font-semibold text-ink hover:bg-surface-3 transition-colors min-w-0"
                    >
                      <Icon className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                      {saved ? (
                        <span className="truncate max-w-[150px]">
                          {label}: <span className="font-normal text-muted">{saved.name.split(',')[0]}</span>
                        </span>
                      ) : saveCandidate ? (
                        <span className="flex items-center gap-1 text-accent">
                          <Plus className="w-3 h-3" />Salvar {label}
                        </span>
                      ) : (
                        <span className="text-muted">{label}</span>
                      )}
                    </button>
                    {saved && (
                      <button
                        type="button"
                        onClick={() => handleClearSlot(id)}
                        aria-label={`Remover atalho ${label}`}
                        title={`Remover ${label}`}
                        className="h-full px-2 text-muted hover:text-ink border-l border-line transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {slotHint && (
              <p className="text-xs text-muted">{slotHint}</p>
            )}
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">Horário</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[['now', 'Agora'], ['depart', 'Sair às'], ['arrive', 'Chegar às']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTimeMode(id)}
                  aria-pressed={timeMode === id}
                  className={`h-10 px-3.5 rounded-full border text-xs font-semibold transition-colors ${timeMode === id ? 'border-brand bg-brand text-on-brand' : 'border-line text-muted hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
              {timeMode !== 'now' && (
                <input
                  type="time"
                  value={clock}
                  onChange={(e) => setClock(e.target.value)}
                  aria-label="Horário"
                  className="h-10 px-3 rounded-[12px] bg-surface-2 border border-line text-sm text-ink focus:outline-none focus:border-brand"
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={search}
            disabled={!canSearch}
            className="w-full h-11 rounded-full bg-brand hover:bg-brand-strong text-on-brand text-sm font-bold disabled:opacity-40 transition-colors"
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
                    className={`w-full text-left p-3.5 rounded-[20px] border transition-colors ${isSel ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-line-strong'}`}
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
                  <Suspense fallback={<div className="w-full h-64 rounded-[16px] skeleton border border-line" />}>
                    <TripRouteMap itinerary={current} />
                  </Suspense>
                  <ol className="space-y-2">
                    {current.legs.map((leg, i) => {
                      if (leg.isWalk) {
                        return (
                          <li key={i} className="flex items-center gap-2.5 px-3 py-2 text-xs text-muted">
                            <Footprints className="w-4 h-4 flex-shrink-0" />
                            <span>{describeLeg(leg)}</span>
                          </li>
                        );
                      }

                      const matchedLine = matchLegToCatalogLine(leg, lines);
                      const canOpenLive = Boolean(matchedLine && onOpenLineStop);

                      return (
                        <li key={i}>
                          {canOpenLive ? (
                            <button
                              type="button"
                              onClick={() => {
                                tapFeedback();
                                onOpenLineStop(matchedLine, leg.from?.name || null);
                                onClose();
                              }}
                              className="w-full text-left p-3 rounded-[16px] bg-canvas hover:bg-surface-2 border border-line hover:border-line-strong flex items-center justify-between gap-3 transition-colors"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <LinePlate line={matchedLine} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-ink truncate">{describeLeg(leg)}</p>
                                  {leg.from?.name && (
                                    <p className="text-xs text-muted truncate">Embarque: {leg.from.name}</p>
                                  )}
                                  {leg.to?.name && (
                                    <p className="text-xs text-faint truncate">Desembarque: {leg.to.name}</p>
                                  )}
                                </div>
                              </div>
                              <span className="flex items-center gap-0.5 text-xs font-semibold text-accent flex-shrink-0">
                                <span>Ao vivo</span>
                                <ChevronRight className="w-4 h-4" />
                              </span>
                            </button>
                          ) : (
                            <div className="p-3 rounded-[16px] bg-canvas border border-line flex items-start gap-2.5 text-sm text-ink">
                              <LinePlate line={{ routeCode: leg.lineCode, bgColor: leg.color, fgColor: leg.textColor }} size="sm" />
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{describeLeg(leg)}</p>
                                {leg.from?.name && (
                                  <p className="text-xs text-muted truncate">Embarque: {leg.from.name}</p>
                                )}
                                {leg.to?.name && (
                                  <p className="text-xs text-faint truncate">Desembarque: {leg.to.name}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
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
