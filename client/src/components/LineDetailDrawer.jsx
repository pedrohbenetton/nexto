import React, { useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';
import { 
  X, Radio, Clock, MapPin, RefreshCw, Bus, AlertCircle, 
  Map, CheckCircle2, Navigation, Activity, Bell, BellRing, 
  ArrowLeftRight, Users, Sparkles, Bookmark, Share2
} from 'lucide-react';
import { PUBLIC_WEB_URL, buildShareUrl, buildShareMessage, shareTrip } from '../utils/shareTrip';
import { transitAlarm } from '../utils/audioAlert';
import { tapFeedback } from '../utils/haptics';
import { isStopSaved, toSavedStop } from '../utils/savedStops';
import { LineDetailSkeleton, PredictionSkeleton } from './Skeleton';
import LinePlate from './LinePlate';

export default function LineDetailDrawer({
  line, onClose, onOpenMap, cityId = 35, initialStopId, savedStops = [], onToggleSavedStop
}) {
  const [activeLine, setActiveLine] = useState(line);
  const [pairedLines, setPairedLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Alerta de Proximidade do Ônibus
  const [alarmTarget, setAlarmTarget] = useState(null); // vehicleId
  const [alarmTriggered, setAlarmTriggered] = useState(false);

  // Lotação reportada
  const [crowdingData, setCrowdingData] = useState({});

  // 1. Carregar linhas pareadas (outros sentidos da mesma rota)
  useEffect(() => {
    let isMounted = true;
    async function fetchPaired() {
      if (!activeLine?.routeCode) return;
      try {
        const res = await fetch(apiUrl(`/api/lines/paired?routeCode=${encodeURIComponent(activeLine.routeCode)}&cityId=${cityId}`));
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setPairedLines(json.data);
        }
      } catch (e) {
        console.warn('Erro ao buscar sentidos da linha:', e);
      }
    }
    fetchPaired();
    return () => { isMounted = false; };
  }, [activeLine?.routeCode, cityId]);

  // 2. Carregar detalhes da linha e paradas
  useEffect(() => {
    let isMounted = true;
    async function fetchDetails() {
      if (!activeLine?.lineRoutesPath) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl(`/api/lines/details?path=${encodeURIComponent(activeLine.lineRoutesPath)}`));
        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setDetails(json.data);
            if (json.data.stops && json.data.stops.length > 0) {
              const initial = initialStopId && json.data.stops.find(s => s.stopId === initialStopId);
              setSelectedStop(initial || json.data.stops[0]);
            }
          } else {
            setError('Falha ao sincronizar o itinerário da linha.');
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDetails();
    return () => { isMounted = false; };
  }, [activeLine]);

  // 3. Carregar previsões em tempo real para a parada selecionada
  const fetchPredictions = async (stop = selectedStop, showLoader = true) => {
    if (!details?.serviceId || !stop?.stopId) return;
    if (showLoader) setPredLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/predictions?serviceId=${encodeURIComponent(details.serviceId)}&stopId=${encodeURIComponent(stop.stopId)}`));
      const json = await res.json();
      if (json.success && json.data) {
        setPredictions(json.data);
        setLastUpdated(new Date());

        // Verificar disparo de Alarme de Proximidade
        if (alarmTarget && !alarmTriggered && json.data.vehicles) {
          const targetVehicle = json.data.vehicles.find(v => v.vehicleId === alarmTarget);
          if (targetVehicle && targetVehicle.secondsUntilArrival <= 180) { // Menos de 3 minutos
            transitAlarm.triggerAlert({
              vehicleId: targetVehicle.vehicleId,
              minutes: targetVehicle.minutesUntilArrival,
              seconds: targetVehicle.secondsUntilArrival,
              stopName: stop.name
            });
            setAlarmTriggered(true);
          }
        }

        // Consultar lotação dos veículos retornados
        if (json.data.vehicles && json.data.vehicles.length > 0) {
          json.data.vehicles.forEach(async (v) => {
            try {
              const cRes = await fetch(apiUrl(`/api/crowding/${v.vehicleId}`));
              const cJson = await cRes.json();
              if (cJson.success && cJson.data) {
                setCrowdingData(prev => ({ ...prev, [v.vehicleId]: cJson.data }));
              }
            } catch (e) {}
          });
        }
      }
    } catch (err) {
      console.error('Erro na telemetria de parada:', err);
    } finally {
      if (showLoader) setPredLoading(false);
    }
  };

  useEffect(() => {
    if (details?.serviceId && selectedStop?.stopId) {
      fetchPredictions(selectedStop, true);
    }
  }, [details, selectedStop]);

  // 4. Polling automático a cada 12s para dados de tempo real
  useEffect(() => {
    if (!autoRefresh || !details?.serviceId || !selectedStop?.stopId) return;
    const interval = setInterval(() => {
      fetchPredictions(selectedStop, false);
    }, 12000);
    return () => clearInterval(interval);
  }, [autoRefresh, details, selectedStop, alarmTarget, alarmTriggered]);

  // Toggle do Alarme de Chegada
  const toggleAlarm = async (vehicleId) => {
    if (alarmTarget === vehicleId) {
      setAlarmTarget(null);
      setAlarmTriggered(false);
      return;
    }

    // Solicitar permissão de áudio / notificação
    await transitAlarm.requestNotificationPermission();
    transitAlarm.playArrivalChime(); // Toca breve tom de confirmação
    tapFeedback();
    setAlarmTarget(vehicleId);
    setAlarmTriggered(false);
  };

  // Reportar Lotação Colaborativa
  const handleVoteCrowding = async (vehicleId, level) => {
    try {
      const res = await fetch(apiUrl('/api/crowding/report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, level })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCrowdingData(prev => ({ ...prev, [vehicleId]: json.data }));
      }
    } catch (e) {
      console.warn('Erro ao registrar voto de lotação:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-scrim backdrop-blur-sm animate-fade-in pt-safe md:p-6">
      <div className="w-full md:max-w-2xl bg-surface border-t md:border border-line rounded-t-[24px] md:rounded-[24px] shadow-lift flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden pb-safe md:pb-0">
        
        {/* Header Drawer */}
        <div className="p-4 sm:p-5 border-b border-line bg-surface flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <LinePlate line={activeLine} size="lg" />
            <div className="min-w-0">
              <h2 className="font-bold text-ink text-base sm:text-lg truncate">
                {activeLine.routeMnemonic || 'Itinerário da Linha'}
              </h2>
              <p className="text-xs text-muted truncate">
                {activeLine.serviceMnemonic || activeLine.companyName || 'Transporte Urbano'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenMap(details, selectedStop, activeLine)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand hover:bg-brand-strong text-on-brand text-xs font-bold whitespace-nowrap transition-colors"
              title="Abrir mapa com localização de todos os ônibus"
            >
              <Navigation className="w-4 h-4 text-on-brand" />
              <span>Mapa</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-[12px] text-muted hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Seletor de Sentido (Ida / Volta) */}
        {pairedLines.length > 1 && (
          <div className="px-5 py-2.5 bg-canvas border-b border-line flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <span className="text-xs text-muted font-semibold flex items-center gap-1.5 flex-shrink-0">
              <ArrowLeftRight className="w-3.5 h-3.5 text-accent" />
              <span>SENTIDO:</span>
            </span>
            <div className="flex items-center gap-2">
              {pairedLines.map((pl) => {
                const isCurrent = pl.lineRoutesPath === activeLine.lineRoutesPath;
                return (
                  <button
                    key={pl.id || pl.lineRoutesPath}
                    onClick={() => {
                      if (!isCurrent) setActiveLine(pl);
                    }}
                    className={`px-3 py-1 rounded-[12px] text-xs font-medium transition-all ${
                      isCurrent
                        ? 'bg-brand text-on-brand font-semibold shadow-sm'
                        : 'bg-surface text-ink hover:bg-surface-2 border border-line'
                    }`}
                  >
                    {pl.serviceMnemonic || pl.routeMnemonic}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Telemetry Status Bar */}
        <div className="px-5 py-2.5 bg-surface-2 border-b border-line flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand"></span>
            <span>TELEMETRIA: <strong className="text-ink">AO VIVO</strong></span>
            {lastUpdated && (
              <span className="text-faint hidden sm:inline">
                [{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {alarmTarget && (
              <span className="text-xs font-semibold text-warn bg-warn-soft border border-warn/40 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <BellRing className="w-3 h-3 text-warn" />
                <span>ALARME #{alarmTarget}</span>
              </span>
            )}

            <button
              onClick={() => fetchPredictions(selectedStop, true)}
              disabled={predLoading}
              className="flex items-center gap-1 text-accent hover:text-accent font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${predLoading ? 'animate-spin' : ''}`} />
              <span>ATUALIZAR</span>
            </button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          
          {loading ? (
            <LineDetailSkeleton />
          ) : error ? (
            <div className="p-4 rounded-[12px] bg-danger-soft border border-danger/30 text-danger text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-danger" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Painel da Parada Ativa */}
              {selectedStop && (
                <div className="bg-canvas border border-line rounded-[20px] p-4 space-y-3.5 shadow-soft">
                  <div className="flex items-start justify-between gap-2 border-b border-line pb-3">
                    <div>
                      <span className="text-[11px] text-accent font-bold uppercase tracking-wider">
                        PARADA SELECIONADA #{selectedStop.index + 1}
                      </span>
                      <h3 className="font-bold text-ink text-sm sm:text-base mt-0.5 leading-snug">
                        {selectedStop.name}
                      </h3>
                      <p className="text-[11px] text-muted mt-0.5">Identificador: {selectedStop.stopId}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {onToggleSavedStop && details?.serviceId && (() => {
                        const saved = isStopSaved(savedStops, details.serviceId, selectedStop.stopId);
                        return (
                          <button
                            onClick={() => {
                              onToggleSavedStop(toSavedStop(activeLine, details, selectedStop));
                              tapFeedback();
                            }}
                            aria-pressed={saved}
                            className={`h-9 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                              saved
                                ? 'bg-brand text-on-brand'
                                : 'bg-surface border border-line hover:border-line-strong text-ink'
                            }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                            <span>{saved ? 'Ponto salvo' : 'Salvar ponto'}</span>
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => onOpenMap(details, selectedStop, activeLine)}
                        className="h-9 px-3.5 rounded-full bg-surface hover:bg-surface-2 border border-line text-xs font-semibold text-ink flex items-center gap-1.5 whitespace-nowrap transition-colors"
                      >
                        <Map className="w-3.5 h-3.5" />
                        <span>Ver no mapa</span>
                      </button>
                    </div>
                  </div>

                  {/* Veículos em Aproximação */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="flex items-center gap-1.5 font-semibold text-ink">
                        <Activity className="w-4 h-4 text-accent" />
                        <span>ÔNIBUS A CAMINHO</span>
                      </span>
                      {predictions?.vehicles && (
                        <span>{predictions.vehicles.length} veículo(s)</span>
                      )}
                    </div>

                    {predLoading ? (
                      <PredictionSkeleton count={2} />
                    ) : predictions?.vehicles && predictions.vehicles.length > 0 ? (
                      <div className="space-y-2.5">
                        {predictions.vehicles.map((v, idx) => {
                          const isApproaching = v.secondsUntilArrival <= 60;
                          const isAlarmActive = alarmTarget === v.vehicleId;
                          const crowd = crowdingData[v.vehicleId];

                          return (
                            <div 
                              key={idx}
                              className={`p-3.5 rounded-[12px] border transition-all space-y-2.5 ${
                                isAlarmActive
                                  ? 'bg-warn-soft border-warn/40'
                                  : v.isRealTime 
                                    ? 'bg-surface border-accent/30 shadow-soft' 
                                    : 'bg-surface border-line'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-ink text-sm">
                                      Prefixo #{v.vehicleId || 'N/A'}
                                    </span>
                                    {v.isRealTime && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-soft text-accent font-bold">
                                        GPS AO VIVO
                                      </span>
                                    )}
                                    {crowd?.level && crowd.level !== 'unknown' && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                        crowd.level === 'low' ? 'bg-success-soft text-success border border-success/40' :
                                        crowd.level === 'medium' ? 'bg-warn-soft text-warn border border-warn/40' :
                                        'bg-danger-soft text-danger border border-danger/30'
                                      }`}>
                                        {crowd.label}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted">
                                    {v.isRealTime ? 'Rastreamento por satélite ativo' : 'Horário programado da tabela'}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <p className={`text-base font-extrabold ${
                                    isApproaching 
                                      ? 'text-accent animate-pulse' 
                                      : 'text-ink'
                                  }`}>
                                    {isApproaching ? 'CHEGANDO' : `${Math.ceil(v.secondsUntilArrival / 60)} min`}
                                  </p>
                                  <p className="text-[11px] text-muted">
                                    {v.secondsUntilArrival}s restantes
                                  </p>
                                </div>
                              </div>

                              {/* Ações: Alarme & Reporte de Lotação */}
                              <div className="pt-2 border-t border-line/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                                {/* Botão de Alarme */}
                                <button
                                  onClick={() => toggleAlarm(v.vehicleId)}
                                  className={`px-3 py-1 rounded-[12px] flex items-center gap-1.5 transition-all text-xs font-semibold ${
                                    isAlarmActive
                                      ? 'bg-warn text-surface shadow-sm'
                                      : 'bg-surface hover:bg-surface-2 text-ink border border-line'
                                  }`}
                                  title="Avisar com som e vibração quando o ônibus estiver a 3 min"
                                >
                                  {isAlarmActive ? (
                                    <>
                                      <BellRing className="w-3.5 h-3.5 text-surface animate-pulse" />
                                      <span>ALARME ATIVO</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bell className="w-3.5 h-3.5 text-muted" />
                                      <span>AVISAR QUANDO CHEGAR</span>
                                    </>
                                  )}
                                </button>

                                {/* Compartilhar viagem (WhatsApp etc.) */}
                                <button
                                  onClick={() => {
                                    const url = buildShareUrl(PUBLIC_WEB_URL, {
                                      lineRoutesPath: activeLine.lineRoutesPath,
                                      serviceId: details?.serviceId,
                                      stopId: selectedStop?.stopId,
                                      vehicleId: v.vehicleId,
                                      routeCode: activeLine.routeCode
                                    });
                                    shareTrip(buildShareMessage({
                                      line: activeLine,
                                      stopName: selectedStop?.name,
                                      seconds: v.secondsUntilArrival,
                                      url
                                    }));
                                  }}
                                  className="px-3 py-1 rounded-[12px] flex items-center gap-1.5 text-xs font-semibold bg-surface hover:bg-surface-2 text-ink border border-line transition-colors"
                                  title="Enviar previsão e link de acompanhamento"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-muted" />
                                  <span>Compartilhar</span>
                                </button>

                                {/* Votação de Lotação */}
                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="text-muted font-medium mr-0.5">LOTAÇÃO:</span>
                                  <button
                                    onClick={() => handleVoteCrowding(v.vehicleId, 'low')}
                                    className="px-2 py-0.5 rounded-[8px] bg-surface hover:bg-success-soft text-success border border-line transition-colors"
                                    title="Vazio / Assentos livres"
                                  >
                                    Vazio
                                  </button>
                                  <button
                                    onClick={() => handleVoteCrowding(v.vehicleId, 'medium')}
                                    className="px-2 py-0.5 rounded-[8px] bg-surface hover:bg-warn-soft text-warn border border-line transition-colors"
                                    title="Moderado / Apenas em pé"
                                  >
                                    Médio
                                  </button>
                                  <button
                                    onClick={() => handleVoteCrowding(v.vehicleId, 'high')}
                                    className="px-2 py-0.5 rounded-[8px] bg-surface hover:bg-danger-soft text-danger border border-line transition-colors"
                                    title="Lotado / Capacidade máxima"
                                  >
                                    Lotado
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-[12px] bg-surface border border-line text-center text-xs text-muted">
                        Nenhum veículo em rota para esta parada neste instante.
                      </div>
                    )}
                  </div>

                  {/* Grade de Partidas */}
                  {selectedStop.departures && selectedStop.departures.length > 0 && (
                    <div className="pt-2 border-t border-line">
                      <p className="text-xs font-semibold text-muted mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        <span>Partidas Programadas Hoje ({selectedStop.departures.length})</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                        {selectedStop.departures.map((t, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-0.5 rounded-[8px] bg-surface border border-line text-ink text-xs font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lista Completa de Paradas da Linha */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-muted px-1">
                  <span className="font-semibold text-ink">Todas as Paradas ({details?.stops?.length || 0})</span>
                  <span className="text-accent">Clique para selecionar</span>
                </div>

                <div className="divide-y divide-surface-2 rounded-[20px] bg-surface border border-line overflow-hidden shadow-soft">
                  {details?.stops?.map((stop, idx) => {
                    const isSelected = selectedStop?.stopId === stop.stopId;
                    return (
                      <button
                        key={stop.stopId}
                        onClick={() => setSelectedStop(stop)}
                        className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors text-xs ${
                          isSelected 
                            ? 'bg-brand-soft border-l-4 border-l-accent' 
                            : 'hover:bg-surface-2'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isSelected 
                            ? 'bg-brand text-on-brand' 
                            : 'bg-surface-2 text-muted border border-line'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm ${isSelected ? 'text-accent font-bold' : 'text-ink font-medium'}`}>
                            {stop.name}
                          </p>
                          <p className="text-[11px] text-muted">
                            {stop.departures?.length || 0} partidas programadas
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
