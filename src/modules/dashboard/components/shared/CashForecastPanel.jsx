import React from 'react';
import { useCashForecast } from '../../../../core/useAccounting';

// ④ 13-week cash forecast (compact) — opening cash/bank, projected inflow/outflow from
// due-dated open invoices, the projected closing and the lowest projected point (the
// liquidity risk to watch). A mini sparkline of the 13 weekly closings shows the shape;
// "View →" opens the full weekly table. Self-contained: own query + loading. Mirrors
// the Cash Forecast dashboard so the figures tie out.
export function CashForecastPanel({ branch, range, formatMoney = (n) => n, onView }) {
  const q = useCashForecast(branch, range);
  const d = q.data || {};
  const rows = d.rows || [];
  const opening = d.opening || 0;
  const totalIn = rows.reduce((s, r) => s + (r.inflow || 0), 0);
  const totalOut = rows.reduce((s, r) => s + (r.outflow || 0), 0);
  const closing = rows.length ? rows[rows.length - 1].closing : opening;
  const low = rows.reduce((m, r) => (r.closing < m.closing ? r : m), { closing: opening, week: 'now' });
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.closing || 0)));

  const stat = (label, val, tone) => (
    <div className="min-w-[88px]">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="text-[13.5px] font-bold tabular-nums" style={{ color: tone === 'bad' ? '#dc2626' : tone === 'good' ? '#16a34a' : '#0d1326' }}>{formatMoney(val)}</div>
    </div>
  );

  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-ink">🔮 13-Week Cash Forecast</h3>
        {onView && <button onClick={onView} style={{ color: '#2563eb' }} className="cursor-pointer text-[11px] font-bold">View →</button>}
      </div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
        {stat('Opening', opening, opening < 0 ? 'bad' : undefined)}
        {stat('Inflow 13w', totalIn, 'good')}
        {stat('Outflow 13w', totalOut)}
        {stat('Proj. Closing', closing, closing < 0 ? 'bad' : 'good')}
        {stat('Lowest Point', low.closing, low.closing < 0 ? 'bad' : undefined)}
      </div>
      {rows.length > 0 ? (
        <>
          <div className="flex items-end gap-[3px]" style={{ height: 44 }}>
            {rows.map((r) => {
              const neg = (r.closing || 0) < 0;
              const h = Math.max(2, (Math.abs(r.closing || 0) / maxAbs) * 42);
              return <div key={r.week} title={`${r.week}: ${formatMoney(r.closing || 0)}`} className="flex-1 rounded-t" style={{ height: h, background: neg ? '#dc2626' : '#0ea5e9' }} />;
            })}
          </div>
          <div className="mt-1 text-[10.5px] text-ink-muted">
            {low.closing < 0 ? <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ Cash gap at {low.week}</span> : `Lowest at ${low.week}`} · weekly projected closing
          </div>
        </>
      ) : (
        <div className="py-3 text-center text-[11.5px] text-ink-muted">{q.isLoading ? 'Building forecast…' : 'No open invoices to project.'}</div>
      )}
    </div>
  );
}
