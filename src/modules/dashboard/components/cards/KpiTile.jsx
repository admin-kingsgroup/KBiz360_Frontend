import React from 'react';

// `growthLabel` names the comparison period for the growth badge. The growth value is
// month-over-previous-month, so the default reads "vs last mo" — NOT the old hardcoded
// "vs Apr" which was only ever right in April. When clickable, the tile is a real button
// to keyboard/AT users (role/tabIndex/Enter-Space) with a ≥44px touch height.
export function KpiTile({ label, value, growth, sub, color, bg, icon, onClick, growthLabel = 'vs last mo' }) {
  const interactive = !!onClick;
  const onKeyDown = interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined;
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={onKeyDown}
      aria-label={interactive ? `${label}: ${value}` : undefined}
      style={{ borderTopColor: color, background: bg || '#fff', ...(interactive ? { minHeight: 88 } : {}) }}
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
              {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% {growthLabel}
            </span>
          )}
          {sub && <span className="text-[9.5px] text-ink-muted">{sub}</span>}
        </div>
      )}
    </div>
  );
}
