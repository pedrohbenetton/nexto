import React, { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../utils/api';
import { getCurrentPosition } from '../utils/geolocation';
import LinePlate from './LinePlate';
import L from 'leaflet';
import { 
  X, RefreshCw, Radio, Navigation, Eye, MapPin, Bus, 
  Crosshair, Footprints, Users, ArrowLeftRight
} from 'lucide-react';

// Cores do mapa: fixas (legíveis sobre tiles claros e escuros), alinhadas à marca
const MAP_COLORS = {
  route: '#c6f432',
  casing: '#0e1116',
  ink: '#0e1116',
  paper: '#ffffff',
  user: '#2f6fe8'
};

// Cálculo de distância geodésica em metros (Haversine)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export default function MapView({ line, details, selectedStop, onClose }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const polylineLayerRef = useRef(null);
  const userLayerRef = useRef(null);

  const [currentLine, setCurrentLine] = useState(line);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [syncCountdown, setSyncCountdown] = useState(12);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Localização do Usuário & Parada Mais Próxima
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [closestStopInfo, setClosestStopInfo] = useState(null);

  // 1. Carregar telemetria de ônibus e paradas
  const fetchTracking = async (showLoader = false) => {
    if (!currentLine?.lineRoutesPath) return;
    if (showLoader) setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/lines/tracking?path=${encodeURIComponent(currentLine.lineRoutesPath)}&serviceId=${details?.serviceId || ''}`));
      const json = await res.json();
      if (json.success && json.data) {
        setTrackingData(json.data);
        setLastSync(new Date());
        setSyncCountdown(12);

        // Se o usuário tem localização ativa, recalcula parada mais próxima
        if (userLocation && json.data.stops) {
          computeClosestStop(userLocation, json.data.stops);
        }
      }
    } catch (err) {
      console.error('Falha na telemetria de veículos:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // 2. Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCoords = [-23.5015, -47.4526];

    const map = L.map(mapContainerRef.current, {
      center: initialCoords,
      zoom: 13,
      zoomControl: false
    });
    mapInstanceRef.current = map;

    // Zoom no canto inferior direito
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Tiles OSM (sem chave). No tema escuro, index.css inverte só os tiles.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    polylineLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);

    fetchTracking(true);

    return () => {
      map.remove();
    };
  }, [currentLine]);

  // 3. Countdown de sincronização
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncCountdown(prev => {
        if (prev <= 1) {
          fetchTracking(false);
          return 12;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentLine, userLocation]);

  // 4. Calcular parada mais próxima
  const computeClosestStop = (coords, stops) => {
    if (!coords || !stops || stops.length === 0) return;

    let closest = null;
    let minDistance = Infinity;

    stops.forEach(stop => {
      if (typeof stop.lat === 'number' && typeof stop.lng === 'number') {
        const dist = getDistanceMeters(coords.lat, coords.lng, stop.lat, stop.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closest = stop;
        }
      }
    });

    if (closest) {
      const walkMinutes = Math.max(1, Math.round(minDistance / 80));
      setClosestStopInfo({
        stop: closest,
        distanceMeters: minDistance,
        walkMinutes
      });
    }
  };

  // 5. Geolocalização do Usuário
  const handleLocateUser = () => {
    setLocatingUser(true);
    getCurrentPosition().then(
      ({ lat, lng }) => {
        setLocatingUser(false);
        const coords = { lat, lng };
        setUserLocation(coords);

        if (userLayerRef.current && mapInstanceRef.current) {
          userLayerRef.current.clearLayers();

          const userHtml = `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgb(47 111 232 / 0.22); animation: radar-ping-blue 2s infinite;"></div>
              <div style="width: 14px; height: 14px; border-radius: 50%; background: ${MAP_COLORS.user}; border: 2.5px solid ${MAP_COLORS.paper}; box-shadow: 0 0 10px rgb(47 111 232 / 0.5);"></div>
            </div>
          `;

          const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: userHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          L.marker([coords.lat, coords.lng], { icon: userIcon, zIndexOffset: 2000 })
            .addTo(userLayerRef.current)
            .bindPopup(`
              <div style="font-family: var(--font-sans); color: var(--nx-ink);">
                <p style="font-weight: 700; margin: 0 0 2px 0;">📍 Sua Localização</p>
                <p style="font-size: 11px; color: var(--nx-muted); margin: 0;">GPS ativo com alta precisão</p>
              </div>
            `);

          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 });
        }

        if (trackingData?.stops) {
          computeClosestStop(coords, trackingData.stops);
        }
      },
      (err) => {
        setLocatingUser(false);
        console.warn('Erro ao obter GPS do usuário:', err);
        alert(err.code === 'UNSUPPORTED'
          ? 'Geolocalização não suportada neste dispositivo.'
          : 'Não foi possível obter sua localização. Verifique as permissões de GPS.');
      }
    );
  };

  // 6. Renderizar Traçado OSRM, Paradas e Ônibus ao Vivo
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !trackingData) return;

    markersLayerRef.current.clearLayers();
    polylineLayerRef.current.clearLayers();

    const bounds = L.latLngBounds();

    // A. Traçado OSRM: lime da marca com contorno escuro (lê bem em tiles claros e escuros)
    if (trackingData.polyline && trackingData.polyline.length > 1) {
      L.polyline(trackingData.polyline, {
        color: MAP_COLORS.casing,
        weight: 9,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(polylineLayerRef.current);

      const linePath = L.polyline(trackingData.polyline, {
        color: MAP_COLORS.route,
        weight: 5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(polylineLayerRef.current);

      bounds.extend(linePath.getBounds());
    }

    // B. Paradas da Linha
    if (trackingData.stops) {
      trackingData.stops.forEach((stop, idx) => {
        const isTarget = selectedStop && selectedStop.stopId === stop.stopId;
        const isClosestToUser = closestStopInfo?.stop?.stopId === stop.stopId;
        
        const stopHtml = `
          <div style="
            width: ${isClosestToUser ? '16px' : isTarget ? '16px' : '10px'};
            height: ${isClosestToUser ? '16px' : isTarget ? '16px' : '10px'};
            background: ${isClosestToUser ? MAP_COLORS.user : isTarget ? MAP_COLORS.route : MAP_COLORS.paper};
            border: ${isTarget ? '3px' : '2px'} solid ${isClosestToUser ? MAP_COLORS.paper : MAP_COLORS.ink};
            border-radius: 50%;
            box-shadow: 0 1px 4px rgb(14 17 22 / 0.3);
          "></div>
        `;

        const stopIcon = L.divIcon({
          className: 'custom-stop-node',
          html: stopHtml,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: stopIcon })
          .addTo(markersLayerRef.current);

        stopMarker.bindPopup(`
          <div style="font-family: var(--font-sans); color: var(--nx-ink); min-width: 190px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--nx-line); padding-bottom: 4px; margin-bottom: 6px;">
              <span style="color: ${isClosestToUser ? 'var(--nx-accent)' : 'var(--nx-ink)'}; font-weight: 700; font-size: 11px;">
                ${isClosestToUser ? '📍 SUA PARADA MAIS PRÓXIMA' : `PARADA #${idx + 1}`}
              </span>
              <span style="color: var(--nx-faint); font-size: 10px;">${stop.stopId ? stop.stopId.slice(0, 8) : ''}</span>
            </div>
            <p style="font-size: 12px; margin: 0 0 6px 0; color: var(--nx-ink); font-weight: 600;">
              ${stop.name}
            </p>
            <div style="font-size: 11px; color: var(--nx-muted);">
              Partidas hoje: <strong style="color: var(--nx-ink);">${stop.departures?.length || 0}</strong>
              ${isClosestToUser ? ` • <span style="color: var(--nx-accent); font-weight: 700;">${closestStopInfo.distanceMeters}m a pé</span>` : ''}
            </div>
          </div>
        `);

        bounds.extend([stop.lat, stop.lng]);
      });
    }

    // C. ÔNIBUS AO VIVO COM BALIZAS DE RADAR
    if (trackingData.vehicles && trackingData.vehicles.length > 0) {
      trackingData.vehicles.forEach(v => {
        const isApproaching = v.status === 'APPROACHING';

        const busHtml = `
          <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
            <div class="radar-beacon" style="
              position: absolute;
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: ${v.isRealTime ? 'rgb(198 244 50 / 0.35)' : 'rgb(14 17 22 / 0.15)'};
              border: 1.5px solid ${v.isRealTime ? MAP_COLORS.route : MAP_COLORS.ink};
            "></div>

            <div style="
              position: relative;
              z-index: 10;
              background: ${MAP_COLORS.ink};
              border: 2px solid ${v.isRealTime ? MAP_COLORS.route : MAP_COLORS.paper};
              border-radius: 10px;
              padding: 2px 8px;
              display: flex;
              align-items: center;
              gap: 5px;
              box-shadow: 0 4px 12px rgb(14 17 22 / 0.35);
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${MAP_COLORS.route}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4C2.9 6 1.9 6.8 1.6 7.8L.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle>
              </svg>
              <span style="font-family: var(--font-display); font-size: 11px; font-weight: 700; color: ${MAP_COLORS.paper};">${v.vehicleId}</span>
            </div>
          </div>
        `;

        const busIcon = L.divIcon({
          className: 'custom-bus-live-marker',
          html: busHtml,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });

        const busMarker = L.marker([v.lat, v.lng], { icon: busIcon, zIndexOffset: 1000 })
          .addTo(markersLayerRef.current);

        busMarker.bindPopup(`
          <div style="font-family: var(--font-sans); color: var(--nx-ink); min-width: 220px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--nx-line); padding-bottom: 5px; margin-bottom: 8px;">
              <span style="color: var(--nx-ink); font-weight: 800; font-size: 13px;">Ônibus #${v.vehicleId}</span>
              <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 9999px; background: ${v.isRealTime ? 'var(--nx-brand-soft)' : 'var(--nx-surface-2)'}; color: ${v.isRealTime ? 'var(--nx-accent)' : 'var(--nx-muted)'};">
                ${v.isRealTime ? 'GPS ATIVO' : 'HORÁRIO ESTIMADO'}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr; gap: 4px; font-size: 12px; margin-bottom: 8px;">
              <div>
                <span style="color: var(--nx-muted);">Status: </span>
                <strong style="color: var(--nx-ink);">${isApproaching ? 'Em Aproximação' : 'Em Trânsito'}</strong>
              </div>
              <div>
                <span style="color: var(--nx-muted);">Previsão de Chegada: </span>
                <strong style="color: var(--nx-accent);">${v.minutesUntilArrival} min (${v.secondsUntilArrival}s)</strong>
              </div>
              <div>
                <span style="color: var(--nx-muted);">Próxima Parada: </span>
                <span style="color: var(--nx-ink); font-weight: 500;">${v.nextStopName ? v.nextStopName.slice(0, 35) + '...' : 'Em rota'}</span>
              </div>
            </div>
          </div>
        `);

        bounds.extend([v.lat, v.lng]);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [trackingData, selectedStop, closestStopInfo]);

  // 7. Centralizar câmera em um veículo específico
  const focusOnVehicle = (v) => {
    if (!mapInstanceRef.current) return;
    setSelectedVehicle(v);
    mapInstanceRef.current.flyTo([v.lat, v.lng], 16, { duration: 1.2 });
  };

  // Helper para limpar nome de parada
  const formatStopTargetName = (rawName) => {
    if (!rawName) return 'Em rota';
    if (rawName.includes('Leopoldo')) return 'Terminal Centro (R. Leopoldo Machado)';
    if (rawName.includes('Pannunzio')) return 'Av. Dr. Armando Pannunzio';
    if (rawName.includes('Carneiro')) return 'Av. General Carneiro';
    if (rawName.includes('Kubitscheck')) return 'Av. Pres. Juscelino K.';
    if (rawName.includes('Moreira')) return 'Av. Moreira César';
    if (rawName.includes('Unnamed')) return currentLine?.routeMnemonic ? `${currentLine.routeMnemonic} (Terminal)` : 'Terminal de Linha';
    return rawName.split(',')[0].replace(/--.*$/, '').trim();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas text-ink animate-fade-in">
      
      {/* Top Telemetry Header (À Esquerda) */}
      <div className="absolute top-safe-4 left-4 z-[2000] pointer-events-none">
        <div className="pointer-events-auto bg-surface/95 backdrop-blur-md border border-line rounded-[20px] p-3 shadow-lift flex items-center gap-3">
          <LinePlate line={currentLine || {}} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-ink truncate max-w-[160px] sm:max-w-xs">
                {currentLine?.routeMnemonic || 'Itinerário'}
              </h2>
              <span className="hidden sm:inline text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-soft text-accent border border-accent/20">
                GPS AO VIVO (EM CIRCULAÇÃO)
              </span>
            </div>
            <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
              <span>Veículos: <strong className="text-ink">{trackingData?.vehiclesCount || 0}</strong></span>
              <span>•</span>
              <span>Headway: <strong className="text-accent">~{trackingData?.telemetrySummary?.estimatedHeadwayMinutes || 15} min</strong></span>
              <span>•</span>
              <span>Paradas: <strong className="text-ink">{trackingData?.stopsCount || 0}</strong></span>
            </p>
          </div>
        </div>

        {/* Notificação de Parada Mais Próxima a Pé */}
        {closestStopInfo && (
          <div className="pointer-events-auto mt-2 p-2.5 rounded-[12px] bg-brand-soft/95 backdrop-blur-md border border-accent/40 shadow-soft text-xs text-accent flex items-center gap-2">
            <Footprints className="w-4 h-4 text-accent flex-shrink-0 animate-pulse" />
            <span>
              Você está a <strong>{closestStopInfo.distanceMeters}m</strong> ({closestStopInfo.walkMinutes} min) da parada: <strong className="text-ink">{closestStopInfo.stop.name.split(',')[0]}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Top Right Controls (Isolados e sem colisão com o zoom do mapa) */}
      <div className="absolute top-safe-4 right-4 z-[2000] flex items-center gap-2 pointer-events-auto">
        {/* Botão de Localização do Usuário */}
        <button
          onClick={handleLocateUser}
          disabled={locatingUser}
          className={`px-3.5 py-2.5 rounded-[12px] border text-xs flex items-center gap-1.5 shadow-sm transition-all ${
            userLocation
              ? 'bg-brand-soft border-accent text-accent font-bold'
              : 'bg-surface hover:bg-surface-2 border-line text-ink'
          }`}
          title="Detectar minha localização e achar parada mais próxima"
        >
          <Crosshair className={`w-4 h-4 ${locatingUser ? 'animate-spin text-accent' : ''}`} />
          <span className="hidden sm:inline font-semibold">MEU GPS</span>
        </button>

        {/* Botão de Sincronização */}
        <button
          onClick={() => fetchTracking(true)}
          disabled={loading}
          className="px-3.5 py-2.5 rounded-[12px] bg-surface hover:bg-surface-2 border border-line text-ink transition-all flex items-center gap-1.5 text-xs shadow-sm font-medium"
          title="Atualizar telemetria"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : 'text-muted'}`} />
          <span className="text-xs text-accent font-bold">{syncCountdown}s</span>
        </button>

        {/* Botão Fechar (Dark CTA Calendly Style) */}
        <button
          onClick={onClose}
          className="px-3.5 py-2.5 rounded-[12px] bg-ink hover:opacity-90 text-canvas transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold active:scale-95 cursor-pointer"
          title="Fechar mapa"
          aria-label="Fechar mapa"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Fechar</span>
        </button>
      </div>

      {/* Container Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Bottom Telemetry Dock */}
      <div className="absolute bottom-safe-4 left-4 right-4 md:left-4 md:right-auto md:w-96 z-[2000] pointer-events-none">
        <div className="pointer-events-auto bg-surface/95 backdrop-blur-md border border-line rounded-[20px] p-3.5 shadow-lift space-y-2.5">
          
          <div className="flex items-center justify-between border-b border-line pb-2 text-xs">
            <span className="text-accent font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-accent" />
              <span>FROTA NA ROTA ({trackingData?.vehiclesCount || 0})</span>
            </span>
            <span className="text-[11px] text-muted">
              Atualização em: {syncCountdown}s
            </span>
          </div>

          {/* Lista de Ônibus Rastreados */}
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-surface-2">
            {trackingData?.vehicles && trackingData.vehicles.length > 0 ? (
              trackingData.vehicles.map((v, i) => (
                <div
                  key={v.vehicleId || i}
                  onClick={() => focusOnVehicle(v)}
                  className={`pt-1.5 first:pt-0 p-2.5 rounded-[12px] cursor-pointer transition-all flex items-center justify-between text-xs ${
                    selectedVehicle?.vehicleId === v.vehicleId 
                      ? 'bg-brand-soft border border-accent/50' 
                      : 'hover:bg-surface-2 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[12px] bg-surface-2 border border-line flex items-center justify-center text-accent font-bold text-xs">
                      <Bus className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink text-xs">Ônibus #{v.vehicleId}</span>
                        {v.isRealTime && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-soft text-accent font-bold">
                            GPS
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted truncate max-w-[170px]">
                        Destino: {formatStopTargetName(v.nextStopName)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-bold ${v.secondsUntilArrival <= 60 ? 'text-accent animate-pulse' : 'text-ink'}`}>
                      {v.secondsUntilArrival <= 60 ? 'Chegando' : `${v.minutesUntilArrival} min`}
                    </span>
                    <p className="text-[10px] text-faint">
                      {v.secondsUntilArrival}s
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-3 text-center text-muted text-xs">
                Nenhum veículo transmitindo sinal no momento.
              </p>
            )}
          </div>

          {/* Rodapé do Dock */}
          <div className="flex items-center justify-between text-[11px] text-muted border-t border-line pt-2">
            <span>Clique no ônibus para centralizar</span>
            <span className="text-accent font-semibold">Nexto</span>
          </div>

        </div>
      </div>

    </div>
  );
}
