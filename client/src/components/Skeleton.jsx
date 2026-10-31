import React from 'react';

// Bloco base com shimmer Pebble (#f0f3f8 → #e7edf6), definido em index.css
export function SkeletonBlock({ className = '', style }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

// announce=false quando o skeleton já está dentro de outra região anunciada
function SkeletonRegion({ label, className = '', announce = true, children }) {
  if (!announce) return <div className={className}>{children}</div>;
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// Espelha o layout do LineCard: badge do código, título/subtítulo, estrela e chevron
export function LineCardSkeleton() {
  return (
    <div className="bg-[#ffffff] border border-[#d4e0ed] rounded-[16px] p-4 flex items-center justify-between gap-3 shadow-calendly-sm">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <SkeletonBlock className="w-14 h-8 rounded-[8px] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-3.5 w-3/4 rounded-full" />
          <SkeletonBlock className="h-3 w-1/2 rounded-full" />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <SkeletonBlock className="w-8 h-8 rounded-full" />
        <SkeletonBlock className="w-7 h-7 rounded-[8px]" />
      </div>
    </div>
  );
}

export function LineListSkeleton({ count = 6 }) {
  return (
    <SkeletonRegion label="Carregando linhas..." className="space-y-4">
      <div className="flex items-center gap-2 overflow-hidden">
        {[64, 96, 56, 128, 120].map((width, i) => (
          <SkeletonBlock key={i} className="h-9 rounded-[50px] flex-shrink-0" style={{ width }} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {Array.from({ length: count }, (_, i) => <LineCardSkeleton key={i} />)}
      </div>
    </SkeletonRegion>
  );
}

// Card de veículo em aproximação (painel da parada selecionada)
export function PredictionSkeleton({ count = 2, announce = true }) {
  return (
    <SkeletonRegion label="Consultando telemetria ao vivo..." className="space-y-2.5" announce={announce}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="p-3.5 rounded-[12px] border border-[#d4e0ed] bg-[#ffffff] space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonBlock className="h-3.5 w-28 rounded-full" />
              <SkeletonBlock className="h-3 w-20 rounded-full" />
            </div>
            <SkeletonBlock className="h-8 w-16 rounded-[8px]" />
          </div>
          <SkeletonBlock className="h-2 w-full rounded-full" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

// Lista de paradas genérica (itinerário do drawer e paradas próximas)
export function StopListSkeleton({ count = 6, label = 'Carregando paradas...', announce = true }) {
  return (
    <SkeletonRegion label={label} className="space-y-1" announce={announce}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          <SkeletonBlock className="w-7 h-7 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className={`h-3.5 rounded-full ${i % 2 ? 'w-2/3' : 'w-4/5'}`} />
            <SkeletonBlock className="h-3 w-1/3 rounded-full" />
          </div>
          <SkeletonBlock className="w-12 h-6 rounded-[8px] flex-shrink-0" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

// Corpo do drawer: painel da parada ativa + itinerário
export function LineDetailSkeleton() {
  return (
    <SkeletonRegion label="Carregando itinerário e paradas..." className="space-y-4">
      <div className="bg-[#f8f9fb] border border-[#d4e0ed] rounded-[16px] p-4 space-y-4">
        <div className="flex items-start justify-between gap-2 border-b border-[#d4e0ed] pb-3">
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-3 w-32 rounded-full" />
            <SkeletonBlock className="h-4 w-3/4 rounded-full" />
            <SkeletonBlock className="h-3 w-24 rounded-full" />
          </div>
          <SkeletonBlock className="h-8 w-28 rounded-[8px]" />
        </div>
        <PredictionSkeleton count={2} announce={false} />
      </div>
      <StopListSkeleton count={5} announce={false} />
    </SkeletonRegion>
  );
}
