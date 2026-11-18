import React, { useState, useEffect, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Maximize2, Minimize2, Settings, RefreshCw, AlertCircle,
  Radio, Bus, ArrowRight, ShieldCheck, QrCode
} from 'lucide-react';
import { apiUrl } from '../utils/api';
import {
  parseTvParams,
  buildMobileQrUrl,
  aggregateTvDepartures
} from '../utils/tvCore';
import TvConfigModal from './TvConfigModal';
import LinePlate from './LinePlate';

export default function TvView() {
  const [params, setParams] = useState(() => parseTvParams(window.location.search));
  const [isConfigOpen, setIsConfigOpen] = useState(!params.isConfigured);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Relógio ao vivo atualizado a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Ouvinte de tela cheia (F / Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const handleKeyDown = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === 'c' || e.key === 'C') {
        setIsConfigOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // 3. Geração do QR Code apontando para o Nexto no celular com a parada
  const mobileUrl = useMemo(() => {
    return buildMobileQrUrl(params, window.location.origin);
  }, [params]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(mobileUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#020617', // slate-950
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (active) setQrCodeDataUrl(url);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [mobileUrl]);

  // 4. Coleta periódica de previsões e partidas
  const fetchDepartures = useCallback(async () => {
    try {
      setError(null);
      let liveVehicles = [];
      let scheduledLines = [];

      // Caso 1: Temos stopId e serviceId diretos
      if (params.stopId && params.serviceId) {
        const res = await fetch(apiUrl(`/api/predictions?serviceId=${encodeURIComponent(params.serviceId)}&stopId=${encodeURIComponent(params.stopId)}`));
        const json = await res.json();
        if (json.success && json.data) {
          const pred = json.data;
          liveVehicles = (pred.vehicles || []).map(v => ({
            ...v,
            routeCode: pred.routeCode || params.lines[0] || '80',
            routeMnemonic: pred.routeMnemonic || params.title || '',
            serviceMnemonic: pred.serviceMnemonic || '',
            lineRoutesPath: params.lineRoutesPath || ''
          }));
        }
      }
      // Caso 2: Temos lineRoutesPath configurado (ex: Sorocaba 80 UFSCar ou GTFS SP)
      else if (params.lineRoutesPath) {
        const [detRes, trkRes] = await Promise.all([
          fetch(apiUrl(`/api/lines/details?path=${encodeURIComponent(params.lineRoutesPath)}`)).catch(() => null),
          fetch(apiUrl(`/api/lines/tracking?path=${encodeURIComponent(params.lineRoutesPath)}&serviceId=${encodeURIComponent(params.serviceId || '')}&cityId=${params.cityId}`)).catch(() => null)
        ]);

        if (trkRes && trkRes.ok) {
          const trkJson = await trkRes.json();
          if (trkJson.success && trkJson.data) {
            const trk = trkJson.data;
            liveVehicles = (trk.vehicles || []).map(v => ({
              ...v,
              routeCode: params.lines[0] || '80',
              routeMnemonic: v.nextStopName ? `Próximo: ${v.nextStopName}` : 'Em trânsito',
              serviceMnemonic: v.status === 'APPROACHING' ? 'Aproximando-se' : 'Em percurso',
              lineRoutesPath: params.lineRoutesPath
            }));
          }
        }

        if (detRes && detRes.ok) {
          const detJson = await detRes.json();
          if (detJson.success && detJson.data) {
            const det = detJson.data;
            const targetStop = params.stopId
              ? (det.stops || []).find(s => s.stopId === params.stopId) || det.stops?.[0]
              : det.stops?.[0];

            if (targetStop && Array.isArray(targetStop.departures) && targetStop.departures.length > 0) {
              scheduledLines.push({
                routeCode: params.lines[0] || '80',
                routeMnemonic: det.lineRoutesPath.split('-')[3] || 'Linha Regular',
                serviceMnemonic: targetStop.name || 'Terminal',
                lineRoutesPath: det.lineRoutesPath,
                departures: targetStop.departures
              });
            }
          }
        }
      }
      // Caso 3: Fallback demonstrativo (busca linhas da cidade se nada configurado)
      else {
        const cityLinesRes = await fetch(apiUrl(`/api/cities/${params.cityId}/lines`)).catch(() => null);
        if (cityLinesRes && cityLinesRes.ok) {
          const json = await cityLinesRes.json();
          if (json.success && json.data) {
            const sample = json.data.slice(0, 6);
            scheduledLines = sample.map(l => ({
              routeCode: l.routeCode,
              routeMnemonic: l.routeMnemonic,
              serviceMnemonic: l.serviceMnemonic,
              lineRoutesPath: l.lineRoutesPath,
              departures: ['06:00', '07:30', '12:00', '16:45', '18:15', '20:30', '22:15']
            }));
          }
        }
      }

      const combined = aggregateTvDepartures({
        liveVehicles,
        scheduledLines,
        linesFilter: params.lines,
        now: new Date()
      });

      setDepartures(combined);
      setLastUpdated(new Date());
    } catch {
      setError('Falha de conexão com a telemetria urbana. Tentando novamente...');
    } finally {
      setLoading(false);
    }
  }, [params]);

  // Polling automático a cada 15 segundos
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await fetchDepartures();
    };
    run();
    const interval = setInterval(run, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchDepartures]);

  // Recarga profunda a cada 2 horas para limpar memória em TVs antigas
  useEffect(() => {
    const reloadTimer = setTimeout(() => {
      window.location.reload();
    }, 2 * 60 * 60 * 1000);
    return () => clearTimeout(reloadTimer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      
      {/* 1. Header do Painel TV */}
      <header className="px-8 py-5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <Bus className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xl tracking-wider text-white">
                  NEXTO<span className="text-emerald-400">TV</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest animate-pulse">
                  <Radio className="w-3 h-3 text-emerald-400" /> Ao Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate font-medium">
                {params.cityName} · Telemetria em Tempo Real
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block" />

          {/* Título do Local */}
          <div className="min-w-0 hidden md:block">
            <h1 className="text-lg lg:text-xl font-display font-bold text-slate-100 truncate">
              {params.title}
            </h1>
            {params.stopName && (
              <p className="text-xs text-slate-400 truncate">
                {params.stopName}
              </p>
            )}
          </div>
        </div>

        {/* Relógio em Destaque Gigante */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-right">
            <div className="font-display text-3xl lg:text-4xl font-extrabold text-white tracking-wider font-mono">
              {timeString}
            </div>
            <div className="text-xs lg:text-sm text-slate-400 capitalize font-medium">
              {dateString}
            </div>
          </div>

          {/* Botões de Ação na TV */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              title="Configurar Painel (Tecla C)"
              aria-label="Configurar Painel"
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              title="Tela Cheia (Tecla F)"
              aria-label="Tela Cheia"
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Conteúdo Principal (Grid Esquerda + Painel Lateral Direita) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        
        {/* Lado Esquerdo: Lista de Próximas Chegadas */}
        <section className="flex-1 flex flex-col overflow-y-auto p-6 lg:p-8 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Próximas Partidas & Ônibus no Ponto
              </span>
              {loading && <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR')}` : 'Carregando dados...'}
            </span>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {departures.length === 0 && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <Bus className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Nenhum ônibus previsto agora</h3>
                <p className="text-sm max-w-md text-slate-400">
                  Não foram detectadas viagens ativas com GPS ou saídas programadas no momento para este ponto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
              >
                Ajustar Linhas / Ponto Monitorado
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {departures.map((dep, idx) => {
                const isArriving = dep.status === 'arriving';
                const isImminent = dep.status === 'imminent';

                return (
                  <div
                    key={dep.id || idx}
                    className={`p-5 lg:p-6 rounded-3xl border transition-all flex items-center justify-between gap-4 ${
                      isArriving
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/50'
                        : isImminent
                          ? 'bg-slate-900/90 border-emerald-500/30'
                          : 'bg-slate-900/60 border-slate-800/80'
                    }`}
                  >
                    {/* Linha & Itinerário */}
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="scale-110 flex-shrink-0">
                        <LinePlate
                          code={dep.routeCode}
                          color={dep.bgColor}
                          textColor={dep.fgColor}
                          isBrt={dep.routeCode.includes('BRT') || (dep.routeMnemonic && dep.routeMnemonic.includes('BRT'))}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-extrabold text-xl lg:text-2xl text-white truncate">
                            {dep.routeMnemonic || `Linha ${dep.routeCode}`}
                          </h4>
                          {dep.isRealTime && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                              <Radio className="w-2.5 h-2.5" /> GPS
                            </span>
                          )}
                        </div>
                        <p className="text-sm lg:text-base text-slate-400 font-medium truncate flex items-center gap-1.5 mt-0.5">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span>{dep.serviceMnemonic || 'Itinerário Regular'}</span>
                          {dep.licensePlate && (
                            <span className="text-xs text-slate-500 font-mono ml-2">
                              · Carro {dep.licensePlate}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Contagem Regressiva em Destaque */}
                    <div className="text-right flex-shrink-0">
                      <div className={`font-display text-3xl lg:text-4xl font-black tracking-tight ${
                        isArriving
                          ? 'text-emerald-400 animate-pulse'
                          : isImminent
                            ? 'text-emerald-300'
                            : dep.isRealTime
                              ? 'text-white'
                              : 'text-amber-400'
                      }`}>
                        {dep.timeText}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                        {dep.isRealTime ? (isArriving ? 'No Ponto' : 'Tempo Estimado') : 'Horário da Tabela'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Lado Direito / Rodapé: QR Code + Avisos do Local + Patrocínio */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800/80 bg-slate-900/40 p-6 lg:p-8 flex flex-col justify-between gap-6 flex-shrink-0">
          
          {/* Card do QR Code do Celular */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col items-center text-center shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Acompanhe no Celular
              </span>
            </div>

            {qrCodeDataUrl ? (
              <div className="p-3 bg-white rounded-2xl shadow-md border-4 border-slate-800/40">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code para abrir no celular"
                  className="w-44 h-44 object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-800 rounded-2xl animate-pulse" />
            )}

            <p className="mt-3.5 text-xs text-slate-300 font-semibold max-w-[220px]">
              Aponte a câmera para ver seu ônibus ao vivo sem propagandas.
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              nexto.app.br
            </p>
          </div>

          {/* Aviso do Local / Patrocínio */}
          {params.notice && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Aviso do Local
                </p>
                <p className="text-xs lg:text-sm text-slate-200 font-medium mt-0.5">
                  {params.notice}
                </p>
              </div>
            </div>
          )}

          {/* Rodapé Informativo */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 font-medium">
            <span>Nexto TV · 100% Livre de Anúncios</span>
            <a
              href="/"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Voltar ao Aplicativo
            </a>
          </div>

        </aside>

      </main>

      {/* Modal de Configuração do Painel */}
      <TvConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        initialParams={params}
        onApply={(newParams) => {
          setParams(newParams);
          setIsConfigOpen(false);
          // Atualiza URL sem recarregar a página
          const newUrl = new URL(window.location.href);
          if (newParams.stopId) newUrl.searchParams.set('stopId', newParams.stopId);
          if (newParams.title) newUrl.searchParams.set('title', newParams.title);
          if (newParams.lines?.length) newUrl.searchParams.set('lines', newParams.lines.join(','));
          if (newParams.notice) newUrl.searchParams.set('notice', newParams.notice);
          window.history.replaceState(null, '', newUrl.toString());
        }}
      />

    </div>
  );
}
