import React from 'react';
import { LINE_FILTERS } from '../utils/lineFilters';

// Pills de categoria (raio 50px). Categorias derivadas sem nenhuma linha ficam ocultas.
const ALWAYS_VISIBLE = ['all', 'favorites'];

export default function FilterPills({ activeFilter, counts, onChange }) {
  const visible = LINE_FILTERS.filter(
    f => ALWAYS_VISIBLE.includes(f.id) || f.id === activeFilter || counts[f.id] > 0
  );

  return (
    <div role="toolbar" aria-label="Filtrar linhas por categoria" className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {visible.map(f => {
        const active = f.id === activeFilter;
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(f.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-[50px] border text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006bff] ${
              active
                ? 'bg-[#006bff] border-[#006bff] text-white'
                : 'bg-[#ffffff] border-[#d4e0ed] text-[#0b3558] hover:border-[#006bff] hover:text-[#006bff]'
            }`}
          >
            <span>{f.label}</span>
            <span className={`text-[11px] font-bold ${active ? 'text-white/80' : 'text-[#a6bbd1]'}`}>
              {counts[f.id] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
