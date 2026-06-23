import React from 'react';
import { QUICK_CREATE_ACTIONS } from '../../utils/constants';

export function QuickCreateBar({ onNavigate }) {
  return (
    <div className="rounded-brand border border-surface-border p-4 shadow-card" style={{ background: '#f9fafb' }}>
      <p className="mb-2.5 text-[11px] font-bold text-ink">⚡ Quick Create</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_CREATE_ACTIONS.map((q) => (
          <button
            key={q.route}
            onClick={() => onNavigate(q.route)}
            className="rounded-lg border-[1.5px] bg-surface px-3.5 py-1.5 text-[10.5px] font-semibold transition-all duration-fast max-tablet:min-h-[44px]"
            style={{ color: q.color, borderColor: `${q.color}30` }}
            onMouseEnter={(e) => { e.currentTarget.style.background = q.color; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = q.color; }}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
