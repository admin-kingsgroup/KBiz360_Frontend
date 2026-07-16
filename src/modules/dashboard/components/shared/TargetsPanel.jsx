import React from 'react';
import { useTargetsVsActual, useBudgetVsActual } from '../../../../core/useAccounting';
import { fyStartMonth } from '../../../../core/period';
import { currencySplit, curRegion, money as fmtCur } from '../../../../core/format';

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
  const salesD = useTargetsVsActual(branch, 'sales', opts).data || {};
  const gpD = useTargetsVsActual(branch, 'gp', opts).data || {};
  const collD = useTargetsVsActual(branch, 'collections', opts).data || {};
  const budD = useBudgetVsActual(branch, opts).data || {};

  // Consolidated ALL view mixing currencies → India (₹) & Africa ($) attainment kept
  // separate (each metric split by currency), never one blended ₹ bar. `byCurrency` is
  // present only then; single-branch responses omit it → identical to before.
  const splitS = currencySplit(salesD), splitG = currencySplit(gpD), splitC = currencySplit(collD), splitB = currencySplit(budD);
  const anySplit = splitS || splitG || splitC || splitB;
  const curList = [];
  [splitS, splitG, splitC, splitB].forEach((sp) => (sp || []).forEach((e) => { if (!curList.some((x) => x.currency === e.currency)) curList.push({ currency: e.currency, symbol: e.symbol }); }));
  const totFor = (split, currency) => (split ? (split.find((x) => x.currency === currency)?.totals || {}) : {});

  const bars = (fm, sales, gp, coll, bud) => (
    <>
      <Bar label="Sales vs Target" actual={sales.actual || 0} target={sales.target || 0} formatMoney={fm} />
      <Bar label="GP vs Target" actual={gp.actual || 0} target={gp.target || 0} formatMoney={fm} />
      <Bar label="Collections vs Target" actual={coll.actual || 0} target={coll.target || 0} formatMoney={fm} />
      <Bar label="Expense vs Budget" actual={bud.actual || 0} target={bud.budget || 0} formatMoney={fm} overIsBad />
    </>
  );

  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-ink">🎯 Targets <span className="font-semibold text-ink-muted">· FY {fy}</span></h3>
        {onView && <button onClick={onView} style={{ color: '#2563eb' }} className="cursor-pointer text-[11px] font-bold">View →</button>}
      </div>
      {anySplit
        ? curList.map((c) => (
            <div key={c.currency} className="mb-2 last:mb-0">
              <div className="mb-1 text-[11px] font-bold text-ink">{c.symbol} <span className="font-semibold text-ink-muted">({curRegion(c.symbol, c.currency)})</span></div>
              {bars((n) => fmtCur(n, c.symbol), totFor(splitS, c.currency), totFor(splitG, c.currency), totFor(splitC, c.currency), totFor(splitB, c.currency))}
            </div>
          ))
        : bars(formatMoney, salesD.totals || {}, gpD.totals || {}, collD.totals || {}, budD.totals || {})}
    </div>
  );
}
