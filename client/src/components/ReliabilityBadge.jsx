import React, { useEffect, useState } from 'react';
import { apiUrl } from '../utils/api';
import { reliabilityBadge } from '../utils/reliability';

const TONE_CLASS = {
  success: 'bg-success-soft text-success border-success/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  danger: 'bg-danger-soft text-danger border-danger/30'
};

// Selo "costuma atrasar X min" da linha numa parada; some quando não há histórico suficiente
export default function ReliabilityBadge({ serviceId, stopId, short = false, className = '' }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!serviceId || !stopId) return undefined;
    let cancelled = false;
    setData(null);
    fetch(apiUrl(`/api/reliability?serviceId=${encodeURIComponent(serviceId)}&stopId=${encodeURIComponent(stopId)}`))
      .then(r => r.json())
      .then(j => { if (!cancelled && j.success) setData(j.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [serviceId, stopId]);

  const badge = reliabilityBadge(data, { short });
  if (!badge) return null;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${TONE_CLASS[badge.tone]} ${className}`}>
      {badge.text}
      {!short && data.samples > 0 && (
        <span className="ml-1.5 font-normal opacity-75">· {data.samples} viagens</span>
      )}
    </span>
  );
}
