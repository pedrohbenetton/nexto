import React, { useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';
import { getCurrentPosition } from '../utils/geolocation';
import { X, Navigation, MapPin, Footprints, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { StopListSkeleton } from './Skeleton';

export default function NearbyStopsModal({ isOpen, onClose, onSelectStop }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCoords, setUserCoords] = useState(null);

  const fetchNearby = () => {
    setLoading(true);
    setError(null);

    getCurrentPosition().then(
      async ({ lat: latitude, lng: longitude }) => {
        setUserCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(apiUrl(`/api/stops/nearby?lat=${latitude}&lng=${longitude}&radius=3000&limit=12`));
          const json = await res.json();
          if (json.success) {
            setStops(json.data || []);
            if (json.data.length === 0) {
              setError('Nenhuma parada cadastrada no raio de 3km da sua posição atual.');
            }
          } else {
            setError(json.error || 'Erro ao consultar paradas próximas.');
          }
        } catch (err) {
          setError('Falha de conexão com o servidor de telemetria.');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setError(err.code === 'UNSUPPORTED'
          ? 'Geolocalização não suportada neste dispositivo.'
          : 'Permissão de GPS negada ou sinal indisponível.');
      }
    );
  };

  useEffect(() => {
    if (isOpen) {
      fetchNearby();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-safe-4 bg-scrim backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-surface border border-line rounded-[24px] shadow-lift flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] bg-brand-soft flex items-center justify-center text-accent">
              <Navigation className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Paradas Próximas ao seu GPS
              </h2>
              <p className="text-xs text-muted">
                Caminhada e embarques mais próximos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[12px] text-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Coords & Refresh bar */}
        <div className="px-5 py-2.5 bg-surface-2 border-b border-line flex items-center justify-between text-xs text-muted">
          <div>
            {userCoords ? (
              <span>GPS: <strong className="text-ink">{userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</strong></span>
            ) : (
              <span>Obtendo coordenadas do GPS...</span>
            )}
          </div>
          <button
            onClick={fetchNearby}
            disabled={loading}
            className="flex items-center gap-1.5 font-semibold text-accent hover:text-accent transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* List Content */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-surface-2">
          {loading && (
            <StopListSkeleton count={6} label="Calculando paradas próximas da sua localização..." />
          )}

          {!loading && error && (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center text-muted text-sm gap-2">
              <AlertCircle className="w-7 h-7 text-muted" />
              <p className="text-ink font-semibold">{error}</p>
              <p className="text-xs text-muted max-w-xs">
                Certifique-se de que a localização do navegador está autorizada.
              </p>
              <button
                onClick={fetchNearby}
                className="mt-3 px-4 py-2 bg-brand hover:bg-brand-strong text-on-brand rounded-[12px] text-xs font-semibold shadow-sm transition-all"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {!loading && !error && stops.length > 0 && stops.map((s, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (onSelectStop) onSelectStop(s);
                onClose();
              }}
              className="pt-2 pb-2 first:pt-0 flex items-center justify-between gap-3 hover:bg-surface-2 p-3 rounded-[12px] cursor-pointer transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-[12px] bg-surface-2 group-hover:bg-surface border border-line text-accent">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink group-hover:text-accent transition-colors">
                    {s.name}
                  </h4>
                  <p className="text-xs text-muted truncate max-w-[220px] sm:max-w-xs">
                    {s.address}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                <span className="text-xs font-bold text-accent bg-brand-soft px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Footprints className="w-3 h-3 text-accent" />
                  {s.distanceMeters < 1000 ? `${s.distanceMeters}m` : `${(s.distanceMeters / 1000).toFixed(1)}km`}
                </span>
                <span className="text-[11px] text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3 text-faint" />
                  ~{s.walkTimeMinutes} min a pé
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-canvas border-t border-line text-center text-xs text-muted">
          Cálculo geodésico de alta precisão sem envio de telemetria a terceiros.
        </div>

      </div>
    </div>
  );
}
