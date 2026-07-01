import React from 'react';
import { useAgeing } from '../../../../core/useAccounting';

// ④ AR / AP ageing (compact) — outstanding by bucket (0–30 / 30–60 / 60–90 / 90+) as a
// stacked bar with the 90+ slice flagged red. As-of-today (not period-scoped), matching
// the Receivables & Payables dashboard. "View →" opens the full ageing. Self-contained.
const BUCKETS = [['0–30', 'd0'], ['30–60', 'd30'], ['60–90', 'd60'], ['90+', 'd90']];
const SLICE = ['#bcd4ee', '#86b7e8', '#5b9bd5', '#dc2626'];

export function AgeingPanel({ branch, formatMoney = (n) => n, onView }) {
  const age = useAgeing(branch).data || {};
  const ar = age.receivables?.totals || {};
  const ap = age.payables?.totals || {};

  const block = (title, t, tone) => {
    const total = t.total || 0;
    return (
      <div className="mb-3 last:mb-0">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11.5px] font-bold text-ink">{title}</span>
          <span className="text-[12px] font-bold tabular-nums" style={{ color: tone }}>{formatMoney(total)}</span>
        </div>
        <div className="flex h-[12px] overflow-hidden rounded" style={{ background: '#eef1f7' }}>
          {BUCKETS.map(([label, k], i) => {
            const v = t[k] || 0;
            const w = total ? (v / total) * 100 : 0;
            return w > 0 ? <div key={k} title={`${label}: ${formatMoney(v)}`} style={{ width: `${w}%`, background: SLICE[i] }} /> : null;
          })}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-[10.5px] text-ink-muted">
          {BUCKETS.map(([label, k]) => (
            <span key={k}>{label}: <b style={{ color: k === 'd90' && (t[k] || 0) > 0 ? '#dc2626' : '#0d1326' }}>{formatMoney(t[k] || 0)}</b></span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-ink">📊 Receivables &amp; Payables</h3>
        {onView && <button onClick={onView} style={{ color: '#2563eb' }} className="cursor-pointer text-[11px] font-bold">View →</button>}
      </div>
      {block('Receivables (to collect)', ar, '#16a34a')}
      {block('Payables (to pay)', ap, '#dc2626')}
    </div>
  );
}
