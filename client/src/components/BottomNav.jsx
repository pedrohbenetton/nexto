import React from 'react';
import { Bus, Navigation, Star, MapPin } from 'lucide-react';

// Navegação inferior (somente mobile)
export default function BottomNav({ active, favoritesCount, onLines, onNearby, onFavorites, onCity }) {
  const items = [
    { id: 'lines', label: 'Linhas', icon: Bus, onClick: onLines },
    { id: 'nearby', label: 'Perto', icon: Navigation, onClick: onNearby },
    { id: 'favorites', label: 'Favoritos', icon: Star, onClick: onFavorites, badge: favoritesCount },
    { id: 'city', label: 'Cidade', icon: MapPin, onClick: onCity }
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line pb-safe"
    >
      <ul className="grid grid-cols-4 h-16">
        {items.map(({ id, label, icon: Icon, onClick, badge }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={onClick}
                aria-current={isActive ? 'page' : undefined}
                className="w-full h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold"
              >
                <span
                  className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-colors ${
                    isActive ? 'bg-brand text-on-brand' : 'text-muted'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive && id === 'favorites' ? 'fill-current' : ''}`} strokeWidth={2.2} />
                  {badge > 0 && (
                    <span className="absolute -top-1 right-2 min-w-4 h-4 px-1 rounded-full bg-signal text-white text-[10px] leading-4 text-center">
                      {badge}
                    </span>
                  )}
                </span>
                <span className={isActive ? 'text-ink' : 'text-muted'}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
