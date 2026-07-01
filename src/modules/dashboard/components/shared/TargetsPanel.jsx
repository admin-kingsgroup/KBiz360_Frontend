import React from 'react';
import { useTargetsVsActual, useBudgetVsActual } from '../../../../core/useAccounting';
import { fyStartMonth } from '../../../../core/period';

// ⑥ Targets — Sales / GP / Collections achievement vs the FY target, plus indirect
// Expense vs Budget, each as a progress bar. Actuals follow the selected period; the
// target/budget is the FY master (so attainment reads against the annual plan). Self-
// contained. A metric with no target set shows a muted "no target" instead of 0%.
const fyOf = (toIso, branch) => {
  const d = toIso ? new Date(toIso) : new Date();
  const sm = fyStartMonth(branch);
  const sy = d.getMonth() >= sm ? d.getFullYear() : d.getFullYear() - 1;
  return `${sy}-${String(sy + 1).slice(-2)}`;
};
const toneFor = (pct) => (pct >= 100 ? '#16a34a' : pct >= 90 ? '#d4a437' : '#dc2626');

function Bar({ label, actual, target, formatMoney, overIsBad = false }) {
  const has = (target || 0) > 0;
  const pct = has ? Math.round((actual / target) * 100) : 0;
  const color = overIsBad ? (pct > 100 ? '#dc2626' : '#16a34a') : toneFor(pct);
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-[11.5px]">
        <span className="font-bold text-ink">{label}</span>
        {has ? (
          <span className="font-semibold text-ink-muted">
            {formatMoney(actual)} / {formatMoney(target)} · <span style={{ color, fontWeight: 700 }}>{pct}%</span>
          </span>
        ) : (
          <span className="text-ink-muted">no target set</span>
        )}
      </div>
      <div className="h-[10px] overflow-hidden rounded" style={{ background: '#eef1f7' }}>
        <div style={{ width: `${Math.min(100, has ? pct : 0)}%`, background: color, height: '100%' }} />
      </div>
    </div>
  );
}

export function TargetsPanel({ branch, range, formatMoney = (n) => n, onView }) {
  const fy = fyOf(range.to, branch);
  const opts = { from: range.from, to: range.to, fy };
  const sales = useTargetsVsActual(branch, 'sales', opts).data?.totals || {};
  const gp = useTargetsVsActual(branch, 'gp', opts).data?.totals || {};
  const coll = useTargetsVsActual(branch, 'collections', opts).data?.totals || {};
  const bud = useBudgetVsActual(branch, opts).data?.totals || {};

  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-ink">🎯 Targets <span className="font-semibold text-ink-muted">· FY {fy}</span></h3>
        {onView && <button onClick={onView} style={{ color: '#2563eb' }} className="cursor-pointer text-[11px] font-bold">View →</button>}
      </div>
      <Bar label="Sales vs Target" actual={sales.actual || 0} target={sales.target || 0} formatMoney={formatMoney} />
      <Bar label="GP vs Target" actual={gp.actual || 0} target={gp.target || 0} formatMoney={formatMoney} />
      <Bar label="Collections vs Target" actual={coll.actual || 0} target={coll.target || 0} formatMoney={formatMoney} />
      <Bar label="Expense vs Budget" actual={bud.actual || 0} target={bud.budget || 0} formatMoney={formatMoney} overIsBad />
    </div>
  );
}
