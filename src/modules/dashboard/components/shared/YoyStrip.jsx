import React from 'react';
import { useYearOverYear } from '../../../../core/useAccounting';

// Year-on-year growth strip — current FY vs last FY for the headline income lines
// (Revenue · Gross Profit · Net Profit), shown as a compact ▲/▼ % row beneath the
// KPI grid. Distinct from the per-tile period-over-period arrows: this is the annual
// trend. Self-contained (owns its own query); renders nothing until it has data.
const deltaPct = (cur, prev) => {
  cur = Number(cur) || 0; prev = Number(prev) || 0;
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
};
const findLine = (rows, q) => (rows || []).find((r) => (r.line || '').toLowerCase().includes(q));

export function YoyStrip({ branch, range }) {
  const yoy = useYearOverYear(branch, range).data || {};
  const rows = yoy.rows || [];
  const items = [
    ['Revenue', findLine(rows, 'revenue')],
    ['Gross Profit', findLine(rows, 'gross profit')],
    ['Net Profit', findLine(rows, 'net profit')],
  ]
    .map(([label, r]) => ({ label, d: r ? deltaPct(r.cy, r.ly) : null }))
    .filter((x) => x.d != null);

  if (!items.length) return null;
  const cyLabel = yoy.current?.label || 'this year';
  const lyLabel = yoy.prior?.label || 'last year';

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-brand border border-surface-border bg-surface px-3 py-2 shadow-card">
      <span className="text-xs font-bold text-ink">Year-on-year</span>
      {items.map((x) => {
        const up = x.d >= 0;
        return (
          <span key={x.label} className="text-[11.5px] text-ink-muted">
            {x.label}{' '}
            <span style={{ color: up ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
              {up ? '▲' : '▼'} {Math.abs(x.d).toFixed(1)}%
            </span>
          </span>
        );
      })}
      <span className="text-[10.5px] text-ink-muted">({cyLabel} vs {lyLabel})</span>
    </div>
  );
}
