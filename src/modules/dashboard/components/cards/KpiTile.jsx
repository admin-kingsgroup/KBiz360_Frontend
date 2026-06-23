import React from 'react';

export function KpiTile({ label, value, growth, sub, color, bg, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ borderTopColor: color, background: bg || '#fff' }}
      className={`rounded-brand border border-t-4 border-surface-border px-4 py-3.5 shadow-card transition-all duration-fast ease-premium ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-pop' : ''}`}
    >
      <div className="mb-1.5 flex items-start justify-between">
        <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color }}>{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-xl font-extrabold tabular-nums text-ink tablet:text-2xl">{value}</p>
      {(growth != null || sub) && (
        <div className="mt-1 flex items-center gap-1.5">
          {growth != null && (
            <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${growth >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
              {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% vs Apr
            </span>
          )}
          {sub && <span className="text-[9.5px] text-ink-muted">{sub}</span>}
        </div>
      )}
    </div>
  );
}
