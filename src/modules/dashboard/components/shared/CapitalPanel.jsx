import React from 'react';
import { useCapitalAnalysis } from '../../../../core/useAccounting';

// ⑤ Capital vs Investment (compact) — capital employed, split into BLOCKED (stuck in
// receivables / stock) vs IN-FLOW (working) capital, plus the GP yield the working
// capital throws off. From /api/accounting/capital-analysis. Self-contained; shows an
// empty state rather than a misleading verdict on zeros.
export function CapitalPanel({ branch, range, formatMoney = (n) => n, onView }) {
  const q = useCapitalAnalysis(branch, range);
  const t = q.data?.totals || {};
  const invested = t.capitalInvested || 0;
  const blocked = t.capitalBlocked || 0;
  const inflow = t.inflowCapital || 0;
  const blockedPct = t.blockedPct || 0;
  const inflowPct = t.inflowPct || 0;
  const gpYield = t.gpYield || 0;
  const hasData = Math.abs(invested) > 0.5 || Math.abs(inflow) > 0.5 || Math.abs(blocked) > 0.5;

  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-ink">💼 Capital vs Investment</h3>
        {onView && <button onClick={onView} style={{ color: '#2563eb' }} className="cursor-pointer text-[11px] font-bold">View →</button>}
      </div>
      {!hasData ? (
        <div className="py-3 text-center text-[11.5px] text-ink-muted">{q.isLoading ? 'Loading capital analysis…' : 'No capital postings for this period.'}</div>
      ) : (
        <>
          <div className="mb-1.5 text-[13px] font-bold tabular-nums text-ink">
            {formatMoney(invested)} <span className="text-[10.5px] font-semibold text-ink-muted">capital employed</span>
          </div>
          <div className="mb-1.5 flex h-[12px] overflow-hidden rounded" style={{ background: '#eef1f7' }}>
            <div title={`In-flow (working): ${formatMoney(inflow)}`} style={{ width: `${Math.min(100, inflowPct)}%`, background: '#16a34a' }} />
            <div title={`Blocked: ${formatMoney(blocked)}`} style={{ width: `${Math.min(100, blockedPct)}%`, background: '#e0a23b' }} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-ink-muted">
            <span>In-flow <b style={{ color: '#16a34a' }}>{formatMoney(inflow)}</b> ({inflowPct.toFixed(0)}%)</span>
            <span>Blocked <b style={{ color: '#b45309' }}>{formatMoney(blocked)}</b> ({blockedPct.toFixed(0)}%)</span>
            <span>GP yield <b className="text-ink">{gpYield.toFixed(1)}%</b></span>
          </div>
        </>
      )}
    </div>
  );
}
