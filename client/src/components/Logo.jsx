import React from 'react';

// Marca Nexto: placa lime com um "N" desenhado como trajeto entre duas paradas
export function LogoMark({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} role="img" aria-label="Nexto">
      <rect width="40" height="40" rx="11" fill="#c6f432" />
      <path
        d="M12 28V13.5L28 26.5V12"
        fill="none"
        stroke="#0e1116"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="28" r="3.6" fill="#0e1116" />
      <circle cx="28" cy="12" r="3.6" fill="#c6f432" stroke="#0e1116" strokeWidth="2.6" />
    </svg>
  );
}

export default function Logo({ size = 36, showTagline = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className="leading-none">
        <span className="font-display text-[22px] font-bold tracking-[-0.03em] text-ink">nexto</span>
        {showTagline && (
          <p className="mt-1 text-[11px] font-medium text-muted">seu ônibus, sem anúncios</p>
        )}
      </div>
    </div>
  );
}
