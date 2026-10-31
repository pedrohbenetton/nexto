import React, { useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';
import { getCurrentPosition } from '../utils/geolocation';
import { MapPin, Star, Search, Cpu, Download, Crosshair, Radio, ShieldCheck } from 'lucide-react';

export default function Header({ 
  currentCity, 
  onOpenCityModal, 
  searchTerm, 
  onSearchChange,
  showOnlyFavorites,
  onToggleOnlyFavorites,
  favoritesCount,
  totalLinesCount,
  installPrompt,
  onInstallPWA,
  onCityDetected,
  onOpenNearbyStops
}) {
  const [detectingGps, setDetectingGps] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-detectar município via GPS
  const handleDetectCity = () => {
    setDetectingGps(true);
    getCurrentPosition({ enableHighAccuracy: false, timeout: 7000 }).then(
      async ({ lat, lng }) => {
        try {
          const res = await fetch(apiUrl(`/api/cities/detect?lat=${lat}&lng=${lng}`));
          const json = await res.json();
          if (json.success && json.data) {
            const parts = (json.data.name || '').split('-');
            const state = parts[0]?.trim() || 'BR';
            const cityName = parts[1]?.trim() || json.data.name;

            if (onCityDetected) {
              onCityDetected({
                cityId: json.data.cityId,
                cityName: cityName,
                stateInitials: state
              });
            }
          }
        } catch (e) {
          console.warn('Erro ao detectar município via GPS:', e);
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        setDetectingGps(false);
        if (err.code === 'UNSUPPORTED') alert('Geolocalização não suportada neste dispositivo.');
        console.warn('Erro de GPS:', err);
      }
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#d4e0ed] shadow-calendly-sm pt-safe">
      {/* Telemetria Ticker Superior */}
      <div className="bg-[#f0f3f8] border-b border-[#d4e0ed] px-4 py-1.5 text-[11px] font-medium text-[#476788] flex items-center justify-between overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[#0b3558]">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#006bff]' : 'bg-rose-500'}`}></span>
            <span className="font-semibold text-[#0b3558]">STATUS:</span>
            <span className={isOnline ? 'text-[#006bff] font-semibold' : 'text-rose-600 font-bold'}>
              {isOnline ? 'CONECTADO (TEMPO REAL)' : 'OFFLINE (CACHE LOCAL)'}
            </span>
          </span>
          <span className="text-[#d4e0ed]">|</span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-[#006bff]" />
            <span>PROTOCOLO: <strong className="text-[#0b3558]">PROTOBUF V3</strong></span>
          </span>
          <span className="text-[#d4e0ed]">|</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[#0b3558] font-semibold">100% LIVRE DE ANÚNCIOS</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[#476788]">
          {installPrompt && (
            <button
              onClick={onInstallPWA}
              className="px-2.5 py-0.5 rounded-[8px] bg-[#006bff] hover:bg-[#005ce6] text-white text-[11px] font-semibold flex items-center gap-1 transition-all shadow-sm"
            >
              <Download className="w-3 h-3" />
              <span>INSTALAR APP</span>
            </button>
          )}
          <span className="hidden sm:inline">LATÊNCIA: <strong className="text-[#0b3558]">12ms</strong></span>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3.5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Logo & Identidade Visual Calendly Style */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-[#006bff] flex items-center justify-center text-white font-bold text-base shadow-[rgba(0,107,255,0.25)_0px_4px_12px]">
              NX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0b3558]">
                  Nexto
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#e6f0ff] text-[#004eba]">
                  TEMPO REAL
                </span>
              </div>
              <p className="text-[12px] text-[#476788]">
                Mobilidade urbana instantânea sem propagandas
              </p>
            </div>
          </div>

          {/* Seletor de Município & Botão GPS */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDetectCity}
              disabled={detectingGps}
              className="p-2 rounded-[8px] bg-[#f0f3f8] hover:bg-[#e6f0ff] border border-[#d4e0ed] text-[#0b3558] hover:text-[#006bff] transition-colors shadow-sm"
              title="Detectar município pelo GPS"
            >
              <Crosshair className={`w-4 h-4 ${detectingGps ? 'animate-spin text-[#006bff]' : ''}`} />
            </button>

            <button
              onClick={onOpenCityModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#ffffff] hover:bg-[#f0f3f8] border border-[#d4e0ed] hover:border-[#a6bbd1] text-xs font-semibold text-[#0b3558] transition-all shadow-sm"
            >
              <MapPin className="w-4 h-4 text-[#006bff]" />
              <span className="truncate max-w-[140px] sm:max-w-none">
                {currentCity?.cityName || 'Sorocaba'}, {currentCity?.stateInitials || 'SP'}
              </span>
              <span className="text-[10px] text-[#476788] font-normal hidden sm:inline">[ALTERAR]</span>
            </button>
          </div>
        </div>

        {/* Barra de Busca e Filtros */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[#476788]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar número da linha, destino ou parada..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#f0f3f8] focus:bg-[#ffffff] border border-[#d4e0ed] focus:border-[#006bff] rounded-[8px] text-[#0b3558] placeholder-[#476788] text-sm focus:outline-none transition-all shadow-sm"
            />
          </div>

          {/* Botão Paradas Próximas */}
          <button
            onClick={onOpenNearbyStops}
            className="px-3.5 py-2.5 rounded-[8px] bg-[#ffffff] hover:bg-[#f0f3f8] border border-[#d4e0ed] text-[#0b3558] hover:text-[#006bff] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm whitespace-nowrap"
            title="Buscar paradas próximas via GPS"
          >
            <Radio className="w-4 h-4 text-[#006bff]" />
            <span className="hidden sm:inline">PARADAS</span>
          </button>

          {/* Botão Favoritos */}
          <button
            onClick={onToggleOnlyFavorites}
            className={`px-3.5 py-2.5 rounded-[8px] border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm whitespace-nowrap ${
              showOnlyFavorites
                ? 'bg-[#e6f0ff] border-[#006bff] text-[#006bff]'
                : 'bg-[#ffffff] hover:bg-[#f0f3f8] border-[#d4e0ed] text-[#0b3558]'
            }`}
          >
            <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-[#006bff] text-[#006bff]' : 'text-[#476788]'}`} />
            <span className="hidden sm:inline">FAVORITOS</span>
            {favoritesCount > 0 && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[#006bff] text-white font-bold">
                {favoritesCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
}
