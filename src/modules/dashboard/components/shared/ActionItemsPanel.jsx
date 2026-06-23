import React from 'react';
import { ACTION_COLORS, ACTION_BACKGROUNDS } from '../../utils/constants';

export function ActionItemsPanel({ items, onItemClick }) {
  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <p className="mb-2.5 text-xs font-bold text-ink">⚡ Today&apos;s Action Items</p>
      {items.map((a, i) => (
        <div
          key={i}
          onClick={() => a.route && onItemClick?.(a.route)}
          className={`mb-1.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${a.route ? 'cursor-pointer' : ''}`}
          style={{ background: ACTION_BACKGROUNDS[a.type], border: a.urgent ? `1px solid ${ACTION_COLORS[a.type]}30` : 'none' }}
        >
          <span className="shrink-0 text-base">{a.icon}</span>
          <span className="flex-1 text-[10.5px]" style={{ color: ACTION_COLORS[a.type], fontWeight: a.urgent ? 700 : 500 }}>
            {a.text}
          </span>
          {a.route && <span className="shrink-0 text-[10px]" style={{ color: ACTION_COLORS[a.type] }}>→</span>}
        </div>
      ))}
    </div>
  );
}
