import React from 'react';
import { Star, ChevronRight, Bus } from 'lucide-react';

export default function LineCard({ line, isFavorite, onToggleFavorite, onSelectLine }) {
  return (
    <div 
      onClick={() => onSelectLine(line)}
      className="group relative bg-[#ffffff] hover:bg-[#ffffff] border border-[#d4e0ed] hover:border-[#006bff] rounded-[16px] p-4 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 shadow-calendly-sm hover:shadow-calendly-card hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        
        {/* Route Code Badge */}
        <div className="flex-shrink-0 min-w-14 px-2.5 py-1.5 rounded-[8px] bg-[#f0f3f8] group-hover:bg-[#e6f0ff] border border-[#d4e0ed] group-hover:border-[#006bff]/40 text-[#006bff] font-bold text-xs sm:text-sm text-center tracking-wide transition-colors">
          {line.routeCode || 'N/A'}
        </div>

        {/* Informações da Rota */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#0b3558] text-sm sm:text-[15px] truncate group-hover:text-[#006bff] transition-colors leading-snug">
              {line.routeMnemonic || line.serviceMnemonic || 'Linha Regular'}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#476788] truncate">
            {line.serviceMnemonic && (
              <span className="truncate">{line.serviceMnemonic}</span>
            )}
            {line.companyName && (
              <>
                <span className="text-[#d4e0ed]">•</span>
                <span className="truncate text-[#476788] text-[11px]">{line.companyName}</span>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Ações Técnicas */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(line);
          }}
          className={`p-2 rounded-full transition-colors ${
            isFavorite 
              ? 'text-[#006bff] bg-[#e6f0ff]' 
              : 'text-[#a6bbd1] hover:text-[#0b3558] hover:bg-[#f0f3f8]'
          }`}
          title={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-[#006bff]' : ''}`} />
        </button>

        <div className="w-7 h-7 rounded-[8px] bg-[#f0f3f8] group-hover:bg-[#006bff] flex items-center justify-center transition-colors">
          <ChevronRight className="w-4 h-4 text-[#476788] group-hover:text-white transition-colors" />
        </div>
      </div>
    </div>
  );
}
