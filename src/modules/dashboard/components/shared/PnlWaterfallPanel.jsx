import React from 'react';
import { useProfitAndLoss, useModulePL } from '../../../../core/useAccounting';

// ③ Profit bridge (waterfall) — Revenue → COGS → Gross Profit → Indirect Income /
// Expense → Net Profit for the SELECTED period. Period-driven (reads the dashboard's
// range, not the MTD ops bundle) and self-contained (own queries + loading). Each row
// is a proportional bar (base = revenue) so the cascade reads at a glance. Mirrors the
// Profitability dashboard's bridge so the figures tie out.
export function PnlWaterfallPanel({ branch, range, formatMoney = (n) => n, onViewFullReport }) {
  const pl = useProfitAndLoss(branch, range).data || {};
  const mpl = useModulePL(branch, { ...range, summary: true }).data || {};
  const sales = mpl?.totals?.sales || 0;
  const cogs = mpl?.totals?.cogs || 0;
  const gp = pl?.grossProfit ?? (sales - cogs);
  const indExp = pl?.indirect?.debitTotal || 0;
  const indInc = pl?.indirect?.creditTotal || 0;
  const net = pl?.netProfit || 0;
  const base = Math.max(1, sales);
  const pctOf = (v) => (sales ? (v / sales) * 100 : 0);

  const rows = [
    { label: 'Revenue', val: sales, color: '#2563eb' },
    { label: '– COGS', val: -cogs, color: '#9aa7c2' },
    { label: '= Gross Profit', val: gp, color: '#16a34a', strong: true },
    { label: '+ Indirect Income', val: indInc, color: '#6fae7e' },
    { label: '– Indirect Expense', val: -indExp, color: '#dd9999' },
    { label: '= Net Profit', val: net, color: net < 0 ? '#dc2626' : '#0d1326', strong: true },
  ];

  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-ink">📉 Profit Bridge <span className="font-semibold text-ink-muted">· {range.label}</span></h3>
        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span className="text-ink-muted">GP {pctOf(gp).toFixed(1)}%</span>
          <span style={{ color: net < 0 ? '#dc2626' : '#16a34a' }}>NP {pctOf(net).toFixed(1)}%</span>
          {onViewFullReport && (
            <button onClick={onViewFullReport} style={{ color: '#2563eb' }} className="cursor-pointer">View →</button>
          )}
        </div>
      </div>
      <div>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2.5 py-[3px]">
            <span className="w-[140px] shrink-0 text-[12px]" style={{ color: '#5b616e', fontWeight: r.strong ? 700 : 400 }}>{r.label}</span>
            <div className="h-[16px] flex-1 rounded" style={{ background: '#eef1f7' }}>
              <div style={{ width: `${Math.min(100, (Math.abs(r.val) / base) * 100)}%`, background: r.color, height: '100%', borderRadius: 4 }} />
            </div>
            <span className="w-[120px] shrink-0 text-right text-[12px] tabular-nums" style={{ fontWeight: 700, color: r.val < 0 ? '#dc2626' : '#0d1326' }}>{formatMoney(r.val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
