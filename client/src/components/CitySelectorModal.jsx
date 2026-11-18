import React, { useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';
import { POPULAR_CITIES } from '../utils/citiesCore';
import { useEscapeKey } from '../utils/useEscapeKey';
import { Search, X, Loader2, Globe } from 'lucide-react';

export default function CitySelectorModal({ isOpen, onClose, onSelectCity, currentCity }) {
  useEscapeKey(onClose, isOpen);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return undefined;

    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/cities?q=${encodeURIComponent(trimmed)}`));
        const data = await res.json();
        if (active && data.success && data.data) {
          setResults(data.data);
        }
      } catch (err) {
        console.error('Erro ao buscar cidades:', err);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  if (!isOpen) return null;

  const hasQuery = query.trim().length > 0;
  const shownResults = hasQuery ? results : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-scrim backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-surface border-t sm:border border-line rounded-t-[28px] sm:rounded-[28px] overflow-hidden flex flex-col max-h-[85vh] pb-safe sm:pb-0">

        {/* Header */}
        <div className="px-5 py-4 border-b border-line bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-brand-soft flex items-center justify-center text-accent">
              <Globe className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">
                Escolher cidade
              </h2>
              <p className="text-xs text-muted">
                Linhas e ônibus ao vivo do município
              </p>
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

        {/* Input de Busca */}
        <div className="p-4 border-b border-line bg-surface">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cidade (ex.: Sorocaba, Salvador)..."
              className="w-full h-11 pl-10 pr-9 bg-surface-2 focus:bg-surface border border-line focus:border-brand rounded-[14px] text-sm text-ink placeholder:text-muted focus:outline-none transition-colors"
            />
            {loading && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
            )}
          </div>
        </div>

        {/* Lista de Cidades */}
        <div className="overflow-y-auto flex-1 p-3 space-y-1">
          {hasQuery ? (
            shownResults.length > 0 ? (
              shownResults.map((c) => {
                const isSelected = currentCity?.cityId === c.cityId;
                return (
                  <button
                    key={c.cityId}
                    type="button"
                    onClick={() => {
                      onSelectCity(c);
                      onClose();
                    }}
                    className={`w-full text-left p-3 rounded-[16px] flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-brand-soft border border-brand text-ink'
                        : 'hover:bg-surface-2 border border-transparent text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[10px] bg-surface-2 border border-line flex items-center justify-center text-xs font-bold text-accent">
                        {c.stateInitials}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-ink">{c.cityName}</p>
                        <p className="text-xs text-muted">{c.stateInitials}{c.countryName ? ` · ${c.countryName}` : ''}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-brand text-on-brand">
                        Atual
                      </span>
                    )}
                  </button>
                );
              })
            ) : !loading ? (
              <div className="p-8 text-center text-sm text-muted">
                Nenhuma cidade encontrada para "{query.trim()}".
              </div>
            ) : null
          ) : (
            <div>
              <p className="text-[11px] font-semibold text-muted px-2 py-2 uppercase tracking-wider">
                Principais cidades
              </p>
              {POPULAR_CITIES.map((c) => {
                const isSelected = currentCity?.cityId === c.cityId;
                return (
                  <button
                    key={c.cityId}
                    type="button"
                    onClick={() => {
                      onSelectCity(c);
                      onClose();
                    }}
                    className={`w-full text-left p-3 rounded-[16px] flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-brand-soft border border-brand text-ink'
                        : 'hover:bg-surface-2 border border-transparent text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[10px] bg-surface-2 border border-line flex items-center justify-center text-xs font-bold text-accent">
                        {c.stateInitials}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-ink">{c.cityName}</p>
                        <p className="text-xs text-muted">{c.stateInitials}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-brand text-on-brand">
                        Atual
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
