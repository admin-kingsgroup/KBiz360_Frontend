import React from 'react';

export function QuickStatsCard({ title = '📈 Quick Stats — YTD', rows }) {
  return (
    <div className="rounded-brand border border-surface-border p-4 shadow-card" style={{ background: '#14161a' }}>
      <p className="mb-2.5 text-[11px] font-bold text-gold">{title}</p>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className="flex justify-between py-1"
          style={{ borderBottom: i < rows.length - 1 ? '1px solid #2e323c' : 'none' }}
        >
          <span className="text-[10.5px] text-ink-subtle">{row.label}</span>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: row.color }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
