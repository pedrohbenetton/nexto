import React, { useState, useEffect } from 'react';
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
        const res = await fetch(`/api/cities?q=${encodeURIComponent(query.trim())}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3558]/35 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#ffffff] border border-[#d4e0ed] rounded-[24px] shadow-calendly-card overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#d4e0ed] bg-[#ffffff] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#e6f0ff] flex items-center justify-center text-[#006bff]">
              <Globe className="w-4 h-4 text-[#006bff]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b3558]">
                Selecionar Cidade
              </h2>
              <p className="text-xs text-[#476788]">
                Consulte horários e frota em tempo real
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#476788] hover:text-[#0b3558] hover:bg-[#f0f3f8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input de Busca */}
        <div className="p-4 border-b border-[#d4e0ed] bg-[#ffffff]">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#476788]" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o município (ex: Sorocaba, Salvador)..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#f0f3f8] focus:bg-[#ffffff] border border-[#d4e0ed] focus:border-[#006bff] rounded-[8px] text-sm text-[#0b3558] placeholder-[#476788] focus:outline-none transition-all shadow-sm"
            />
            {loading && (
              <Loader2 className="absolute right-3.5 top-3 w-4 h-4 text-[#006bff] animate-spin" />
            )}
          </div>
        </div>

        {/* Lista de Cidades */}
        <div className="overflow-y-auto flex-1 p-3 divide-y divide-[#f0f3f8]">
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
                      ? 'bg-[#e6f0ff] border border-[#006bff]/50 text-[#006bff]' 
                      : 'hover:bg-[#f0f3f8] text-[#0b3558]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[8px] bg-[#f0f3f8] border border-[#d4e0ed] flex items-center justify-center text-xs font-bold text-[#006bff]">
                      {c.stateInitials}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#0b3558]">{c.cityName}</p>
                      <p className="text-xs text-[#476788]">{c.stateInitials} • Código #{c.cityId}</p>
                    </div>
                  </div>
                  {currentCity?.cityId === c.cityId && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#006bff] text-white">
                      Selecionado
                    </span>
                  )}
                </button>
              ))
            ) : !loading ? (
              <div className="p-8 text-center text-sm text-[#476788]">
                Nenhum município localizado para "{query}".
              </div>
            ) : null
          ) : (
            <div>
              <p className="text-xs font-semibold text-[#476788] px-2 py-2 uppercase tracking-wider">
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
                      ? 'bg-[#e6f0ff] border border-[#006bff]/50 text-[#006bff]' 
                      : 'hover:bg-[#f0f3f8] text-[#0b3558]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] bg-[#f0f3f8] border border-[#d4e0ed] flex items-center justify-center text-xs font-bold text-[#006bff]">
                      {c.stateInitials}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#0b3558]">{c.cityName}</p>
                      <p className="text-xs text-[#476788]">Rede Metropolitana #{c.cityId}</p>
                    </div>
                  </div>
                  {currentCity?.cityId === c.cityId && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#006bff] text-white">
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
