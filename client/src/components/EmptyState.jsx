import React from 'react';

// Estado vazio minimalista: ícone em círculo Pebble, título, apoio e até duas ações
export default function EmptyState({ icon: Icon, title, description, actions = [] }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-[#f0f3f8] border border-[#d4e0ed] flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-[#a6bbd1]" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-base font-bold text-[#0b3558] max-w-sm leading-snug">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-[#476788] max-w-xs leading-relaxed">{description}</p>
      )}
      {actions.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actions.map(({ label, onClick, primary }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition-colors ${
                primary
                  ? 'bg-[#006bff] hover:bg-[#005ce6] text-white'
                  : 'bg-[#ffffff] hover:bg-[#f0f3f8] text-[#0b3558] border border-[#d4e0ed]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
