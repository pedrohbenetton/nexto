import React from 'react';

// Estado vazio minimalista: ícone em círculo Pebble, título, apoio e até duas ações
export default function EmptyState({ icon: Icon, title, description, actions = [] }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-surface-2 border border-line flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-faint" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-base font-bold text-ink max-w-sm leading-snug">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted max-w-xs leading-relaxed">{description}</p>
      )}
      {actions.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actions.map(({ label, onClick, primary }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`px-4 py-2 rounded-[12px] text-xs font-semibold transition-colors ${
                primary
                  ? 'bg-brand hover:bg-brand-strong text-on-brand'
                  : 'bg-surface hover:bg-surface-2 text-ink border border-line'
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
