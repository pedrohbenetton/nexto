import React, { useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';
import { Search, MapPin, X, Loader2, Globe } from 'lucide-react';

export default function CitySelectorModal({ isOpen, onClose, onSelectCity, currentCity }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popularCities] = useState([
    { cityId: 35, cityName: 'Sorocaba', stateInitials: 'SP' },
    { cityId: 1, cityName: 'São Paulo', stateInitials: 'SP' },
    { cityId: 10, cityName: 'Salvador', stateInitials: 'BA' },
    { cityId: 14, cityName: 'Belo Horizonte', stateInitials: 'MG' },
    { cityId: 18, cityName: 'Recife', stateInitials: 'PE' },
    { cityId: 22, cityName: 'Maceió', stateInitials: 'AL' }
  ]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/cities?q=${encodeURIComponent(query.trim())}`));
        const data = await res.json();
        if (data.success && data.data) {
          setResults(data.data);
        }
      } catch (err) {
        console.error('Erro ao buscar cidades:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-safe-4 bg-scrim backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-surface border border-line rounded-[24px] shadow-lift overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-line bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] bg-brand-soft flex items-center justify-center text-accent">
              <Globe className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Selecionar Cidade
              </h2>
              <p className="text-xs text-muted">
                Consulte horários e frota em tempo real
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

        {/* Input de Busca */}
        <div className="p-4 border-b border-line bg-surface">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o município (ex: Sorocaba, Salvador)..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-2 focus:bg-surface border border-line focus:border-accent rounded-[12px] text-sm text-ink placeholder-muted focus:outline-none transition-all shadow-sm"
            />
            {loading && (
              <Loader2 className="absolute right-3.5 top-3 w-4 h-4 text-accent animate-spin" />
            )}
          </div>
        </div>

        {/* Lista de Cidades */}
        <div className="overflow-y-auto flex-1 p-3 divide-y divide-surface-2">
          {query.trim().length > 0 ? (
            results.length > 0 ? (
              results.map((c) => (
                <button
                  key={c.cityId}
                  onClick={() => {
                    onSelectCity(c);
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-[12px] flex items-center justify-between transition-colors ${
                    currentCity?.cityId === c.cityId 
                      ? 'bg-brand-soft border border-accent/50 text-accent' 
                      : 'hover:bg-surface-2 text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[12px] bg-surface-2 border border-line flex items-center justify-center text-xs font-bold text-accent">
                      {c.stateInitials}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-ink">{c.cityName}</p>
                      <p className="text-xs text-muted">{c.stateInitials} • Código #{c.cityId}</p>
                    </div>
                  </div>
                  {currentCity?.cityId === c.cityId && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand text-on-brand">
                      Selecionado
                    </span>
                  )}
                </button>
              ))
            ) : !loading ? (
              <div className="p-8 text-center text-sm text-muted">
                Nenhum município localizado para "{query}".
              </div>
            ) : null
          ) : (
            <div>
              <p className="text-xs font-semibold text-muted px-2 py-2 uppercase tracking-wider">
                Principais Cidades Atendidas
              </p>
              {popularCities.map((c) => (
                <button
                  key={c.cityId}
                  onClick={() => {
                    onSelectCity(c);
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-[12px] flex items-center justify-between transition-colors ${
                    currentCity?.cityId === c.cityId 
                      ? 'bg-brand-soft border border-accent/50 text-accent' 
                      : 'hover:bg-surface-2 text-ink'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[12px] bg-surface-2 border border-line flex items-center justify-center text-xs font-bold text-accent">
                      {c.stateInitials}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-ink">{c.cityName}</p>
                      <p className="text-xs text-muted">Rede Metropolitana #{c.cityId}</p>
                    </div>
                  </div>
                  {currentCity?.cityId === c.cityId && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-brand text-on-brand">
                      Ativo
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
