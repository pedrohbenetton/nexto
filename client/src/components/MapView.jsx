import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../utils/api';
import { getCurrentPosition } from '../utils/geolocation';
import { useEscapeKey } from '../utils/useEscapeKey';
import LinePlate from './LinePlate';
import L from 'leaflet';
import {
  X, RefreshCw, Radio, Navigation, Bus,
  Crosshair, Footprints, ArrowLeftRight
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
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function computeClosestStopData(coords, stops) {
  if (!coords || !stops || stops.length === 0) return null;

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

  if (!closest) return null;
  return {
    stop: closest,
    distanceMeters: minDistance,
    walkMinutes: Math.max(1, Math.round(minDistance / 80))
  };
}

export default function MapView({ line, details, selectedStop, cityId = 35, onClose, followVehicleId }) {
  useEscapeKey(onClose, true);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const polylineLayerRef = useRef(null);
  const userLayerRef = useRef(null);

  const [currentLine, setCurrentLine] = useState(line);
  const [pairedLines, setPairedLines] = useState([]);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncCountdown, setSyncCountdown] = useState(12);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Localização do Usuário
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const lineRoutesPath = currentLine?.lineRoutesPath;
  const isOriginalLine = lineRoutesPath === line?.lineRoutesPath;
  const activeServiceId = isOriginalLine ? (details?.serviceId || '') : '';

  const closestStopInfo = userLocation && trackingData?.stops
    ? computeClosestStopData(userLocation, trackingData.stops)
    : null;

  // Buscar sentidos pareados da linha para permitir inverter direto no mapa
  useEffect(() => {
    let active = true;
    if (!currentLine?.routeCode) return undefined;
    fetch(apiUrl(`/api/lines/paired?routeCode=${encodeURIComponent(currentLine.routeCode)}&cityId=${cityId}`))
      .then(r => r.json())
      .then(j => {
        if (active && j.success && Array.isArray(j.data)) setPairedLines(j.data);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [currentLine?.routeCode, cityId]);

  const fetchTracking = useCallback(async (showLoader = false) => {
    if (!lineRoutesPath) return;
    if (showLoader) setLoading(true);
    try {
      const res = await fetch(apiUrl(
        `/api/lines/tracking?path=${encodeURIComponent(lineRoutesPath)}&serviceId=${encodeURIComponent(activeServiceId)}&cityId=${cityId}`
      ));
      const json = await res.json();
      if (json.success && json.data) {
        setTrackingData(json.data);
        setSyncCountdown(12);
      }
    } catch (err) {
      console.error('Falha ao atualizar mapa da linha:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [lineRoutesPath, activeServiceId, cityId]);

  // Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      center: [-23.5015, -47.4526],
      zoom: 13,
      zoomControl: false
    });
    mapInstanceRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);
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
  }, [fetchTracking]);

  // Countdown de sincronização a cada 12s
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
  }, [fetchTracking]);

  // Geolocalização do Usuário
  const handleLocateUser = () => {
    setLocatingUser(true);
    setGpsError(null);
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
                <p style="font-weight: 700; margin: 0 0 2px 0;">📍 Sua localização</p>
                <p style="font-size: 11px; color: var(--nx-muted); margin: 0;">Posição atual pelo GPS</p>
              </div>
            `);

          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 });
        }
      },
      (err) => {
        setLocatingUser(false);
        setGpsError(err?.code === 'UNSUPPORTED'
          ? 'Geolocalização não suportada neste dispositivo.'
          : 'Permissão de localização negada ou GPS indisponível.');
      }
    );
  };

  // Renderizar Traçado OSRM, Paradas e Ônibus ao Vivo
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !trackingData) return;

    markersLayerRef.current.clearLayers();
    polylineLayerRef.current.clearLayers();

    const bounds = L.latLngBounds();

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

    if (trackingData.stops) {
      trackingData.stops.forEach((stop, idx) => {
        const isTarget = isOriginalLine && selectedStop && selectedStop.stopId === stop.stopId;
        const isClosestToUser = closestStopInfo?.stop?.stopId === stop.stopId;

        const stopHtml = `
          <div style="
            width: ${isClosestToUser || isTarget ? '16px' : '10px'};
            height: ${isClosestToUser || isTarget ? '16px' : '10px'};
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
                ${isClosestToUser ? '📍 PARADA MAIS PRÓXIMA' : `PARADA #${idx + 1}`}
              </span>
            </div>
            <p style="font-size: 12px; margin: 0 0 6px 0; color: var(--nx-ink); font-weight: 600;">
              ${stop.name}
            </p>
            <div style="font-size: 11px; color: var(--nx-muted);">
              Partidas hoje: <strong style="color: var(--nx-ink);">${stop.departures?.length || 0}</strong>
              ${isClosestToUser ? ` • <span style="color: var(--nx-accent); font-weight: 700;">${closestStopInfo.distanceMeters} m a pé</span>` : ''}
            </div>
          </div>
        `);

        bounds.extend([stop.lat, stop.lng]);
      });
    }

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
                ${v.isRealTime ? 'AO VIVO' : 'ESTIMADO'}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr; gap: 4px; font-size: 12px; margin-bottom: 4px;">
              <div>
                <span style="color: var(--nx-muted);">Situação: </span>
                <strong style="color: var(--nx-ink);">${isApproaching ? 'Chegando ao ponto' : 'Em circulação'}</strong>
              </div>
              <div>
                <span style="color: var(--nx-muted);">Chegada: </span>
                <strong style="color: var(--nx-accent);">${v.minutesUntilArrival} min</strong>
              </div>
              <div>
                <span style="color: var(--nx-muted);">Próximo ponto: </span>
                <span style="color: var(--nx-ink); font-weight: 500;">${v.nextStopName ? v.nextStopName.slice(0, 42) : 'Em rota'}</span>
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
  }, [trackingData, selectedStop, closestStopInfo, isOriginalLine]);

  // Link de viagem compartilhada: segue o ônibus a cada atualização
  const followed = followVehicleId
    ? trackingData?.vehicles?.find(v => String(v.vehicleId) === String(followVehicleId))
    : null;
  const followedLat = followed?.lat;
  const followedLng = followed?.lng;

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof followedLat !== 'number' || typeof followedLng !== 'number') return;
    map.setView([followedLat, followedLng], Math.max(map.getZoom(), 15), { animate: true });
  }, [followedLat, followedLng]);

  const activeVehicle = selectedVehicle || followed;

  const focusOnVehicle = (v) => {
    if (!mapInstanceRef.current) return;
    setSelectedVehicle(v);
    mapInstanceRef.current.flyTo([v.lat, v.lng], 16, { duration: 1.2 });
  };

  const switchDirection = () => {
    if (pairedLines.length < 2) return;
    const idx = pairedLines.findIndex(pl => pl.lineRoutesPath === currentLine?.lineRoutesPath);
    const next = pairedLines[(idx + 1) % pairedLines.length];
    if (next) {
      setSelectedVehicle(null);
      setCurrentLine(next);
    }
  };

  const formatStopTargetName = (rawName) => {
    if (!rawName) return 'Em rota';
    if (rawName.includes('Unnamed')) return currentLine?.routeMnemonic ? `${currentLine.routeMnemonic} (Terminal)` : 'Terminal';
    return rawName.split(',')[0].replace(/--.*$/, '').trim();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas text-ink animate-fade-in">

      {/* Cabeçalho da linha (à esquerda) */}
      <div className="absolute top-safe-4 left-4 right-4 sm:right-auto z-[2000] pointer-events-none max-w-md">
        <div className="pointer-events-auto bg-surface/95 backdrop-blur-md border border-line rounded-[20px] p-3 flex items-center gap-3">
          <LinePlate line={currentLine || {}} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-sm sm:text-base text-ink truncate">
                {currentLine?.serviceMnemonic || currentLine?.routeMnemonic || 'Itinerário'}
              </h2>
            </div>
            <p className="text-xs text-muted flex items-center gap-2 mt-0.5 flex-wrap">
              <span>Ônibus ativos: <strong className="text-ink">{trackingData?.vehiclesCount || 0}</strong></span>
              <span>•</span>
              <span>Intervalo: <strong className="text-accent">~{trackingData?.telemetrySummary?.estimatedHeadwayMinutes || 15} min</strong></span>
              <span>•</span>
              <span>Paradas: <strong className="text-ink">{trackingData?.stopsCount || 0}</strong></span>
            </p>
          </div>
          {pairedLines.length > 1 && (
            <button
              type="button"
              onClick={switchDirection}
              title="Inverter sentido da linha"
              aria-label="Inverter sentido da linha"
              className="h-9 px-2.5 rounded-full border border-line hover:border-line-strong bg-canvas text-xs font-semibold text-ink flex items-center gap-1 flex-shrink-0 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">Sentido</span>
            </button>
          )}
        </div>

        {closestStopInfo && (
          <div className="pointer-events-auto mt-2 p-2.5 rounded-[14px] bg-brand-soft/95 backdrop-blur-md border border-accent/40 text-xs text-accent flex items-center gap-2">
            <Footprints className="w-4 h-4 text-accent flex-shrink-0" />
            <span>
              Parada mais próxima a <strong>{closestStopInfo.distanceMeters} m</strong> (~{closestStopInfo.walkMinutes} min): <strong className="text-ink">{closestStopInfo.stop.name.split(',')[0]}</strong>
            </span>
          </div>
        )}

        {gpsError && (
          <div className="pointer-events-auto mt-2 p-2.5 rounded-[14px] bg-danger-soft border border-danger/30 text-xs text-danger">
            {gpsError}
          </div>
        )}
      </div>

      {/* Controles no topo à direita */}
      <div className="absolute top-safe-4 right-4 z-[2000] hidden sm:flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={handleLocateUser}
          disabled={locatingUser}
          className={`h-10 px-3.5 rounded-full border text-xs flex items-center gap-1.5 transition-colors ${
            userLocation
              ? 'bg-brand-soft border-accent text-accent font-bold'
              : 'bg-surface hover:bg-surface-2 border-line text-ink font-semibold'
          }`}
          title="Mostrar minha posição e parada mais próxima"
        >
          <Crosshair className={`w-4 h-4 ${locatingUser ? 'animate-spin text-accent' : ''}`} />
          <span>Meu local</span>
        </button>

        <button
          type="button"
          onClick={() => fetchTracking(true)}
          disabled={loading}
          className="h-10 px-3.5 rounded-full bg-surface hover:bg-surface-2 border border-line text-ink transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Atualizar mapa agora"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : 'text-muted'}`} />
          <span className="text-accent font-bold">{syncCountdown}s</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="h-10 px-3.5 rounded-full bg-ink hover:opacity-90 text-canvas transition-opacity flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          title="Fechar mapa"
          aria-label="Fechar mapa"
        >
          <X className="w-4 h-4" />
          <span>Fechar</span>
        </button>
      </div>

      {/* Container Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Barra flutuante inferior */}
      <div className="absolute bottom-safe-4 left-4 right-4 md:left-4 md:right-auto md:w-96 z-[2000] pointer-events-none">
        {/* Ações rápidas no mobile (acima do dock) */}
        <div className="flex sm:hidden items-center justify-end gap-2 mb-2 pointer-events-auto">
          <button
            type="button"
            onClick={handleLocateUser}
            disabled={locatingUser}
            aria-label="Minha localização"
            className="h-10 px-3 rounded-full bg-surface/95 border border-line text-xs font-semibold text-ink flex items-center gap-1.5"
          >
            <Crosshair className={`w-4 h-4 ${locatingUser ? 'animate-spin text-accent' : 'text-accent'}`} />
            <span>GPS</span>
          </button>
          <button
            type="button"
            onClick={() => fetchTracking(true)}
            disabled={loading}
            aria-label="Atualizar mapa"
            className="h-10 px-3 rounded-full bg-surface/95 border border-line text-xs font-bold text-accent flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{syncCountdown}s</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mapa"
            className="h-10 px-3.5 rounded-full bg-ink text-canvas text-xs font-semibold flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>

        <div className="pointer-events-auto bg-surface/95 backdrop-blur-md border border-line rounded-[20px] p-3.5 space-y-2.5">
          {followVehicleId && trackingData && (
            <div className={`rounded-[12px] px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
              followed ? 'bg-brand text-on-brand' : 'bg-warn-soft text-warn'
            }`}>
              <Navigation className="w-3.5 h-3.5" />
              {followed
                ? `Acompanhando o ônibus #${followVehicleId} ao vivo`
                : `Ônibus #${followVehicleId} sem sinal de GPS agora`}
            </div>
          )}

          <div className="flex items-center justify-between border-b border-line pb-2 text-xs">
            <span className="text-accent font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-accent" />
              <span>Ônibus em circulação ({trackingData?.vehiclesCount || 0})</span>
            </span>
            <span className="text-[11px] text-muted">
              Atualiza em {syncCountdown}s
            </span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {trackingData?.vehicles && trackingData.vehicles.length > 0 ? (
              trackingData.vehicles.map((v, i) => (
                <button
                  key={v.vehicleId || i}
                  type="button"
                  onClick={() => focusOnVehicle(v)}
                  className={`w-full text-left p-2.5 rounded-[12px] transition-colors flex items-center justify-between text-xs ${
                    activeVehicle?.vehicleId === v.vehicleId
                      ? 'bg-brand-soft border border-accent/50'
                      : 'hover:bg-surface-2 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-[10px] bg-surface-2 border border-line flex items-center justify-center text-accent font-bold text-xs flex-shrink-0">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink text-xs">Ônibus #{v.vehicleId}</span>
                        {v.isRealTime && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-soft text-accent font-bold">
                            GPS
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted truncate">
                        Próximo: {formatStopTargetName(v.nextStopName)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-2">
                    <span className={`text-xs font-bold ${v.secondsUntilArrival <= 60 ? 'text-accent animate-pulse' : 'text-ink'}`}>
                      {v.secondsUntilArrival <= 60 ? 'Chegando' : `${v.minutesUntilArrival} min`}
                    </span>
                    <p className="text-[10px] text-faint">
                      {v.secondsUntilArrival}s
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="py-3 text-center text-muted text-xs">
                Nenhum ônibus com GPS ativo nesta linha agora.
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
