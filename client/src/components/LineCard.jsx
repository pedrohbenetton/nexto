import React from 'react';
import { Star, ArrowRight } from 'lucide-react';
import LinePlate from './LinePlate';

export default function LineCard({ line, isFavorite, onToggleFavorite, onSelectLine }) {
  const title = line.routeMnemonic || line.serviceMnemonic || 'Linha regular';
  const open = () => onSelectLine(line);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className="group relative bg-surface border border-line hover:border-line-strong rounded-[20px] p-3.5 pr-3 cursor-pointer flex items-center gap-3.5 transition-colors active:scale-[0.99]"
    >
      <LinePlate line={line} />

      <div className="min-w-0 flex-1">
        <h3 className="font-display font-semibold text-ink text-[15px] leading-snug truncate">
          {title}
        </h3>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted min-w-0">
          {line.serviceMnemonic && line.serviceMnemonic !== title && (
            <>
              <ArrowRight className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{line.serviceMnemonic}</span>
            </>
          )}
          {line.companyName && (
            <span className="truncate text-faint">{line.serviceMnemonic ? `· ${line.companyName}` : line.companyName}</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(line);
        }}
        className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${
          isFavorite ? 'text-on-brand bg-brand' : 'text-faint hover:text-ink hover:bg-surface-2'
        }`}
        title={isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
        aria-label={isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
        aria-pressed={isFavorite}
      >
        <Star className={`w-[18px] h-[18px] ${isFavorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}
