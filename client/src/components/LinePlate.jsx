import React from 'react';
import { lineColor } from '../utils/lineColor';

const SIZES = {
  sm: 'min-w-10 h-7 px-2 text-xs rounded-[8px]',
  md: 'min-w-14 h-10 px-2.5 text-sm rounded-[12px]',
  lg: 'min-w-16 h-12 px-3 text-lg rounded-[14px]'
};

// "Placa" do código da linha, na cor da linha
export default function LinePlate({ line, size = 'md', className = '' }) {
  const { bg, fg } = lineColor(line);
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center font-display font-bold tracking-tight ring-1 ring-inset ring-black/10 dark:ring-white/15 ${SIZES[size]} ${className}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {line.routeCode || '—'}
    </span>
  );
}
