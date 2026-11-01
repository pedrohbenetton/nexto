import React, { useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';
import { getCurrentPosition } from '../utils/geolocation';
import { MapPin, Star, Search, Download, Crosshair, Navigation, WifiOff, ChevronDown, X } from 'lucide-react';
import Logo from './Logo';

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
    <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur-xl border-b border-line pt-safe">
      {!isOnline && (
        <div className="bg-danger-soft text-danger text-xs font-semibold px-4 py-1.5 flex items-center justify-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Sem conexão: mostrando dados salvos</span>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-3 pb-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Logo size={34} />

          <div className="flex items-center gap-2">
            {installPrompt && (
              <button
                onClick={onInstallPWA}
                className="hidden sm:flex h-10 px-3.5 rounded-full bg-ink text-canvas text-xs font-semibold items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                <span>Instalar app</span>
              </button>
            )}

            {/* Atalhos (desktop); no mobile ficam na barra inferior */}
            <button
              onClick={onOpenNearbyStops}
              className="hidden md:flex h-10 px-3.5 rounded-full border border-line bg-surface hover:border-line-strong text-xs font-semibold text-ink items-center gap-1.5 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              <span>Perto de mim</span>
            </button>

            <button
              onClick={onToggleOnlyFavorites}
              aria-pressed={showOnlyFavorites}
              className={`hidden md:flex h-10 px-3.5 rounded-full border text-xs font-semibold items-center gap-1.5 transition-colors ${
                showOnlyFavorites
                  ? 'bg-brand border-brand text-on-brand'
                  : 'bg-surface border-line hover:border-line-strong text-ink'
              }`}
            >
              <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-current' : ''}`} />
              <span>Favoritos</span>
              {favoritesCount > 0 && (
                <span className={`text-[11px] font-bold ${showOnlyFavorites ? 'text-on-brand/70' : 'text-muted'}`}>
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Cidade + detecção por GPS */}
            <div className="flex items-center h-10 rounded-full border border-line bg-surface overflow-hidden">
              <button
                onClick={onOpenCityModal}
                className="h-full pl-3.5 pr-2 flex items-center gap-1.5 text-xs font-semibold text-ink hover:bg-surface-2 transition-colors"
              >
                <MapPin className="w-4 h-4 text-accent" />
                <span className="truncate max-w-[110px] sm:max-w-[180px]">
                  {currentCity?.cityName || 'Sorocaba'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted" />
              </button>
              <span className="w-px h-5 bg-line" />
              <button
                onClick={handleDetectCity}
                disabled={detectingGps}
                className="h-full px-3 text-muted hover:text-ink hover:bg-surface-2 transition-colors"
                title="Detectar minha cidade pelo GPS"
                aria-label="Detectar minha cidade pelo GPS"
              >
                <Crosshair className={`w-4 h-4 ${detectingGps ? 'animate-spin text-accent' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Linha, destino ou parada"
            aria-label="Buscar linha, destino ou parada"
            className="w-full h-12 pl-12 pr-11 rounded-2xl bg-surface border border-line focus:border-ink text-[15px] font-medium text-ink placeholder:text-faint placeholder:font-normal focus:outline-none transition-colors [&::-webkit-search-cancel-button]:hidden"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-surface-2 text-muted hover:text-ink flex items-center justify-center"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
