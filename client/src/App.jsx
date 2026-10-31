import React, { useState, useEffect, useMemo } from 'react';
import { apiUrl } from './utils/api';
import Header from './components/Header';
import LineCard from './components/LineCard';
import LineDetailDrawer from './components/LineDetailDrawer';
import MapView from './components/MapView';
import CitySelectorModal from './components/CitySelectorModal';
import NearbyStopsModal from './components/NearbyStopsModal';
import FilterPills from './components/FilterPills';
import EmptyState from './components/EmptyState';
import { LineListSkeleton } from './components/Skeleton';
import { LINE_FILTERS, lineId, filterLines, countByFilter } from './utils/lineFilters';
import { AlertCircle, Radio, History, SearchX, Star, Route, MapPinOff } from 'lucide-react';

export default function App() {
  // Estado da Cidade Ativa (padrão: Sorocaba - SP)
  const [currentCity, setCurrentCity] = useState(() => {
    try {
      const saved = localStorage.getItem('citta_selected_city');
      return saved ? JSON.parse(saved) : { cityId: 35, cityName: 'Sorocaba', stateInitials: 'SP' };
    } catch {
      return { cityId: 35, cityName: 'Sorocaba', stateInitials: 'SP' };
    }
  });

  // Linhas da Cidade
  const [lines, setLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(true);
  const [linesError, setLinesError] = useState(null);

  // Busca e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Favoritos persistidos
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('citta_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Histórico de Linhas Recentes
  const [recentLines, setRecentLines] = useState(() => {
    try {
      const saved = localStorage.getItem('citta_recent_lines');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modais e Visualizadores
  const [selectedLine, setSelectedLine] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isNearbyModalOpen, setIsNearbyModalOpen] = useState(false);

  // PWA Install Prompt
  const [installPrompt, setInstallPrompt] = useState(null);

  // Ouvir evento PWA
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Salvar cidade ao alterar
  useEffect(() => {
    if (currentCity) {
      localStorage.setItem('citta_selected_city', JSON.stringify(currentCity));
    }
  }, [currentCity]);

  // Salvar favoritos ao alterar
  useEffect(() => {
    localStorage.setItem('citta_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Salvar recentes ao alterar
  useEffect(() => {
    localStorage.setItem('citta_recent_lines', JSON.stringify(recentLines));
  }, [recentLines]);

  // Carregar linhas quando a cidade mudar
  useEffect(() => {
    let isMounted = true;
    async function loadLines() {
      if (!currentCity?.cityId) return;
      setLoadingLines(true);
      setLinesError(null);
      try {
        const res = await fetch(apiUrl(`/api/cities/${currentCity.cityId}/lines`));
        const data = await res.json();
        if (isMounted) {
          if (data.success && data.data) {
            setLines(data.data);
          } else {
            setLinesError('Nenhum registro de linha encontrado para esta cidade.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setLinesError('Falha na conexão com o serviço de telemetria.');
        }
      } finally {
        if (isMounted) setLoadingLines(false);
      }
    }
    loadLines();
    return () => { isMounted = false; };
  }, [currentCity]);

  // Registrar em Recentes ao abrir linha
  const handleSelectLine = (line) => {
    setSelectedLine(line);
    setRecentLines(prev => {
      const filtered = prev.filter(l => (l.lineRoutesPath || l.id) !== (line.lineRoutesPath || line.id));
      return [line, ...filtered].slice(0, 5); // Mantém os 5 mais recentes
    });
  };

  // Alternar favorito
  const handleToggleFavorite = (line) => {
    const lineId = line.id || line.routeCode;
    setFavorites(prev => {
      const exists = prev.includes(lineId);
      if (exists) {
        return prev.filter(id => id !== lineId);
      } else {
        return [...prev, lineId];
      }
    });
  };

  // Filtragem rápida em memória (categoria + busca)
  const filteredLines = useMemo(
    () => filterLines(lines, { filter: activeFilter, searchTerm, favorites }),
    [lines, searchTerm, activeFilter, favorites]
  );

  const filterCounts = useMemo(
    () => countByFilter(lines, { searchTerm, favorites }),
    [lines, searchTerm, favorites]
  );

  const showOnlyFavorites = activeFilter === 'favorites';
  const hasSearch = searchTerm.trim().length > 0;
  const activeFilterLabel = LINE_FILTERS.find(f => f.id === activeFilter)?.label;

  // Conteúdo do estado vazio conforme o motivo
  const emptyState = (() => {
    const showAll = { label: 'Ver todas as linhas', onClick: () => setActiveFilter('all') };
    const clearSearch = { label: 'Limpar busca', onClick: () => setSearchTerm(''), primary: true };

    if (lines.length === 0) {
      return {
        icon: MapPinOff,
        title: `Nenhuma linha em ${currentCity?.cityName || 'esta cidade'}`,
        description: 'Ainda não há linhas publicadas para esta cidade.',
        actions: [{ label: 'Trocar cidade', onClick: () => setIsCityModalOpen(true), primary: true }]
      };
    }
    if (hasSearch) {
      const elsewhere = activeFilter !== 'all' && filterCounts.all > 0;
      return {
        icon: SearchX,
        title: `Nada encontrado para "${searchTerm.trim()}"`,
        description: elsewhere
          ? `Nenhum resultado em ${activeFilterLabel}, mas há ${filterCounts.all} em outras categorias.`
          : 'Confira o número da linha ou tente o nome de um bairro ou terminal.',
        actions: elsewhere ? [clearSearch, { ...showAll, label: 'Buscar em todas' }] : [clearSearch]
      };
    }
    if (showOnlyFavorites) {
      return {
        icon: Star,
        title: 'Você ainda não tem favoritos',
        description: 'Toque na estrela de uma linha para encontrá-la aqui rapidamente, mesmo offline.',
        actions: [{ ...showAll, primary: true }]
      };
    }
    return {
      icon: Route,
      title: `Nenhuma linha em ${activeFilterLabel}`,
      description: 'Esta categoria não tem linhas nesta cidade.',
      actions: [{ ...showAll, primary: true }]
    };
  })();

  return (
    <div className="relative min-h-screen bg-[#f8f9fb] text-[#0b3558] flex flex-col font-sans overflow-x-hidden selection:bg-[#006bff] selection:text-white">
      
      {/* Decorative Atmosphere Blobs (Coral Magenta & Sky Cyan - Calendly System) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[720px] h-[320px] bg-gradient-to-r from-[#e55cff]/10 via-[#0099ff]/12 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Header
        currentCity={currentCity}
        onOpenCityModal={() => setIsCityModalOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showOnlyFavorites={showOnlyFavorites}
        onToggleOnlyFavorites={() => setActiveFilter(prev => (prev === 'favorites' ? 'all' : 'favorites'))}
        favoritesCount={favorites.length}
        totalLinesCount={lines.length}
        installPrompt={installPrompt}
        onInstallPWA={handleInstallPWA}
        onOpenNearbyStops={() => setIsNearbyModalOpen(true)}
        onCityDetected={(city) => {
          setCurrentCity(city);
          setSearchTerm('');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
        
        {/* Status / Estatísticas Técnicas */}
        <div className="flex items-center justify-between text-xs text-[#476788] px-1 border-b border-[#d4e0ed] pb-3">
          <span>
            {loadingLines ? (
              'Sincronizando catálogo de rotas e telemetria...'
            ) : (
              <>
                Rotas Disponíveis: <strong className="text-[#0b3558] font-semibold">{filteredLines.length}</strong> de <span className="text-[#476788]">{lines.length}</span>
              </>
            )}
          </span>

          <span className="flex items-center gap-1.5 text-[#006bff] font-semibold">
            <Radio className="w-3.5 h-3.5 text-[#006bff]" />
            <span className="hidden sm:inline">SATÉLITE E GTFS ATIVOS</span>
          </span>
        </div>

        {/* Linhas Acessadas Recentemente */}
        {!searchTerm && recentLines.length > 0 && activeFilter === 'all' && (
          <div className="space-y-2 pt-1 pb-2">
            <div className="flex items-center justify-between text-xs text-[#476788] font-semibold px-1">
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#006bff]" />
                <span>ÚLTIMAS ROTAS CONSULTADAS</span>
              </span>
              <button 
                onClick={() => setRecentLines([])}
                className="text-[#476788] hover:text-[#0b3558] transition-colors"
              >
                Limpar
              </button>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5">
              {recentLines.map((rl) => (
                <button
                  key={rl.lineRoutesPath || rl.id}
                  onClick={() => handleSelectLine(rl)}
                  className="px-3 py-2 rounded-[12px] bg-[#ffffff] hover:bg-[#ffffff] border border-[#d4e0ed] hover:border-[#006bff] text-xs flex items-center gap-2.5 flex-shrink-0 transition-all shadow-calendly-sm hover:-translate-y-0.5"
                >
                  <span className="px-2 py-0.5 rounded-[6px] bg-[#f0f3f8] text-[#006bff] font-bold text-xs">
                    {rl.routeCode}
                  </span>
                  <span className="text-[#0b3558] font-semibold truncate max-w-[170px]">
                    {rl.routeMnemonic}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Linhas */}
        {/* Filtros de Categoria (pills) */}
        {!loadingLines && !linesError && lines.length > 0 && (
          <FilterPills activeFilter={activeFilter} counts={filterCounts} onChange={setActiveFilter} />
        )}

        {loadingLines ? (
          <LineListSkeleton count={6} />
        ) : linesError ? (
          <div className="py-16 text-center space-y-3 p-8 rounded-[24px] bg-[#ffffff] border border-red-200 shadow-calendly-sm">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="text-sm font-bold text-red-700">{linesError}</p>
            <button
              onClick={() => setCurrentCity({ ...currentCity })}
              className="px-4 py-2 rounded-[8px] bg-[#006bff] hover:bg-[#005ce6] text-xs font-semibold text-white transition-all shadow-sm"
            >
              Tentar Novamente
            </button>
          </div>
        ) : filteredLines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredLines.map(line => {
              const id = lineId(line);
              const isFav = favorites.includes(id);
              return (
                <LineCard
                  key={id}
                  line={line}
                  isFavorite={isFav}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectLine={handleSelectLine}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState {...emptyState} />
        )}
      </main>

      {/* Drawer de Detalhes da Linha & Previsões em Tempo Real */}
      {selectedLine && (
        <LineDetailDrawer
          line={selectedLine}
          cityId={currentCity?.cityId || 35}
          onClose={() => setSelectedLine(null)}
          onOpenMap={(details, selectedStop, activeLine) => {
            setMapData({ line: activeLine || selectedLine, details, selectedStop });
          }}
        />
      )}

      {/* Visualizador de Mapa Interativo (Leaflet) com Rastreador de Ônibus em Tempo Real */}
      {mapData && (
        <MapView
          line={mapData.line}
          details={mapData.details}
          selectedStop={mapData.selectedStop}
          onClose={() => setMapData(null)}
        />
      )}

      {/* Modal de Paradas Próximas via GPS */}
      <NearbyStopsModal
        isOpen={isNearbyModalOpen}
        onClose={() => setIsNearbyModalOpen(false)}
        onSelectStop={(stop) => {
          setSearchTerm(stop.name);
        }}
      />

      {/* Modal de Seleção de Cidade */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        currentCity={currentCity}
        onSelectCity={(city) => {
          setCurrentCity(city);
          setSearchTerm('');
        }}
      />
    </div>
  );
}
