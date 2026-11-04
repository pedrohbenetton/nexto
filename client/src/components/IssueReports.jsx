import React, { useEffect, useState } from 'react';
import { apiUrl } from '../utils/api';

export const ISSUE_OPTIONS = {
  no_ac: 'Sem ar',
  broken: 'Quebrado',
  unsafe_night: 'Inseguro à noite'
};

// Relatos colaborativos: mostra os problemas recentes e permite reportar novos.
export default function IssueReports({ subjectId, types }) {
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setIssues([]);
    fetch(apiUrl(`/api/issues/${encodeURIComponent(subjectId)}`))
      .then(r => r.json())
      .then(j => { if (!cancelled && j.success) setIssues(j.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [subjectId]);

  const report = async (type) => {
    try {
      const res = await fetch(apiUrl('/api/issues/report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, type })
      });
      const json = await res.json();
      if (json.success) setIssues(json.data);
    } catch (e) {
      console.warn('Erro ao registrar relato:', e);
    }
  };

  return (
    <div className="space-y-1">
      {issues.filter(i => types.includes(i.type)).map(i => (
        <p key={i.type} className="text-[11px] font-semibold text-warn">
          ⚠ {i.label} ({i.count})
        </p>
      ))}
      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        <span className="text-muted font-medium mr-0.5">RELATAR:</span>
        {types.map(type => (
          <button
            key={type}
            onClick={() => report(type)}
            className="px-2 py-0.5 rounded-[8px] bg-surface hover:bg-warn-soft text-warn border border-line transition-colors"
          >
            {ISSUE_OPTIONS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
