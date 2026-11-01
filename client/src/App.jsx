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
import { AlertCircle, History, SearchX, Star, Route, MapPinOff, Bookmark } from 'lucide-react';
import MyStops from './components/MyStops';
import { toggleSavedStop } from './utils/savedStops';
import { parseShareParams } from './utils/shareTripCore';
import LinePlate from './components/LinePlate';
import BottomNav from './components/BottomNav';

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
  const [selectedStopId, setSelectedStopId] = useState(null);
  // Link de viagem compartilhada (?linha=...&onibus=...) abre direto no mapa seguindo o ônibus
  const [mapData, setMapData] = useState(() => {
    const trip = parseShareParams(window.location.search);
    if (!trip) return null;
    return {
      line: { lineRoutesPath: trip.lineRoutesPath, routeCode: trip.routeCode },
      details: { serviceId: trip.serviceId },
      selectedStop: trip.stopId ? { stopId: trip.stopId } : null,
      followVehicleId: trip.vehicleId
    };
  });

  useEffect(() => {
    if (parseShareParams(window.location.search)) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
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

  // Meus pontos (linha + parada) persistidos
  const [savedStops, setSavedStops] = useState(() => {
    try {
      const saved = localStorage.getItem('nexto_saved_stops');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('nexto_saved_stops', JSON.stringify(savedStops));
  }, [savedStops]);

  const handleToggleSavedStop = (entry) => setSavedStops(prev => toggleSavedStop(prev, entry));

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
  const handleSelectLine = (line, stopId = null) => {
    setSelectedLine(line);
    setSelectedStopId(stopId);
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

  const bottomNavActive = isNearbyModalOpen ? 'nearby' : isCityModalOpen ? 'city' : showOnlyFavorites ? 'favorites' : 'lines';

  return (
    <div className="relative min-h-screen bg-canvas text-ink flex flex-col font-sans overflow-x-hidden selection:bg-brand selection:text-on-brand">

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

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-tabbar md:pb-12 space-y-6">

        {/* Meus pontos: quem já salvou pontos abre o app direto nos próximos ônibus */}
        {!hasSearch && activeFilter === 'all' && savedStops.length > 0 && (
          <MyStops
            savedStops={savedStops}
            onOpen={(entry) => handleSelectLine(
              lines.find(l => l.lineRoutesPath === entry.line.lineRoutesPath) || entry.line,
              entry.stopId
            )}
            onRemove={handleToggleSavedStop}
          />
        )}

        {/* Hero (primeiro uso, ainda sem pontos salvos) */}
        {!hasSearch && activeFilter === 'all' && savedStops.length === 0 && (
          <section className="relative overflow-hidden rounded-[28px] bg-[#0e1116] text-white dark:bg-surface dark:border dark:border-line px-5 py-6 sm:px-8 sm:py-9">
            <div aria-hidden="true" className="absolute -right-14 -top-14 w-32 h-32 sm:-right-10 sm:-top-16 sm:w-56 sm:h-56 rounded-full bg-brand" />
            <div aria-hidden="true" className="absolute -right-6 -bottom-12 w-24 h-24 sm:right-16 sm:bottom-[-70px] sm:w-40 sm:h-40 rounded-full bg-signal" />
            <div className="relative max-w-[78%] sm:max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                {currentCity?.cityName || 'Sorocaba'} · {currentCity?.stateInitials || 'SP'}
              </p>
              <h2 className="mt-2 font-display text-[28px] sm:text-[40px] font-bold leading-[1.05]">
                Pra onde você vai <span className="text-brand">agora?</span>
              </h2>
              <p className="mt-3 text-sm text-white/70">
                {loadingLines
                  ? 'Carregando linhas da cidade...'
                  : `${lines.length} linhas com ônibus em tempo real. Sem anúncios, sempre.`}
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85">
                <Bookmark className="w-3.5 h-3.5 flex-shrink-0 text-brand" />
                <span>Abra uma linha e toque em <strong className="text-white">Salvar ponto</strong></span>
              </p>
            </div>
          </section>
        )}

        {/* Recentes */}
        {!hasSearch && recentLines.length > 0 && activeFilter === 'all' && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <History className="w-4 h-4 text-muted" />
                Recentes
              </h2>
              <button
                onClick={() => setRecentLines([])}
                className="text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                Limpar
              </button>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              {recentLines.map((rl) => (
                <button
                  key={rl.lineRoutesPath || rl.id}
                  onClick={() => handleSelectLine(rl)}
                  className="pl-1.5 pr-3.5 py-1.5 rounded-2xl bg-surface border border-line hover:border-line-strong flex items-center gap-2.5 flex-shrink-0 transition-colors"
                >
                  <LinePlate line={rl} size="sm" />
                  <span className="text-sm font-semibold text-ink truncate max-w-[170px]">
                    {rl.routeMnemonic}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Lista de linhas */}
        <section className="space-y-3.5">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-base font-bold text-ink">
              {hasSearch ? 'Resultados' : showOnlyFavorites ? 'Seus favoritos' : 'Todas as linhas'}
            </h2>
            {!loadingLines && !linesError && (
              <span className="text-xs text-muted">
                <strong className="text-ink font-semibold">{filteredLines.length}</strong> de {lines.length}
              </span>
            )}
          </div>

          {!loadingLines && !linesError && lines.length > 0 && (
            <FilterPills activeFilter={activeFilter} counts={filterCounts} onChange={setActiveFilter} />
          )}

          {loadingLines ? (
            <LineListSkeleton count={6} />
          ) : linesError ? (
            <EmptyState
              icon={AlertCircle}
              title="Não conseguimos carregar as linhas"
              description={linesError}
              actions={[{ label: 'Tentar novamente', onClick: () => setCurrentCity({ ...currentCity }), primary: true }]}
            />
          ) : filteredLines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
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
        </section>
      </main>

      <BottomNav
        active={bottomNavActive}
        favoritesCount={favorites.length}
        onLines={() => {
          setActiveFilter('all');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNearby={() => setIsNearbyModalOpen(true)}
        onFavorites={() => setActiveFilter(prev => (prev === 'favorites' ? 'all' : 'favorites'))}
        onCity={() => setIsCityModalOpen(true)}
      />

      {/* Drawer de Detalhes da Linha & Previsões em Tempo Real */}
      {selectedLine && (
        <LineDetailDrawer
          line={selectedLine}
          initialStopId={selectedStopId}
          savedStops={savedStops}
          onToggleSavedStop={handleToggleSavedStop}
          cityId={currentCity?.cityId || 35}
          onClose={() => setSelectedLine(null)}
          onOpenMap={(details, selectedStop, activeLine) => {
            setMapData({ line: activeLine || selectedLine, details, selectedStop });
          }}
        />
      )}

      {/* Visualizador de Mapa Interativo (Leaflet) com Rastreador de Ônibus em Tempo Real */}
      {/* Vindo de link compartilhado, espera o catálogo para mostrar o nome da linha */}
      {mapData && !(mapData.followVehicleId && loadingLines) && (
        <MapView
          line={lines.find(l => l.lineRoutesPath === mapData.line.lineRoutesPath) || mapData.line}
          details={mapData.details}
          selectedStop={mapData.selectedStop}
          followVehicleId={mapData.followVehicleId}
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
