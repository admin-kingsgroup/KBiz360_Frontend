import React from 'react';
import { useCustomerLtv } from '../../../../core/useAccounting';
import { currencySplit, curRegion, money as fmtCur } from '../../../../core/format';
import { SkeletonText } from '../../../../shell/primitives';

// ⑥ Top customers by value (LTV + ABC) — who drives the branch's revenue this period:
// the top 5 by lifetime value with their ABC class and GP%. Self-contained; period-
// driven. "View →" opens the full Customer Value board.
//
// The customer-ltv endpoint returns rows ranked by value but NOT an ABC class (that
// lives in the separate abc-analysis report). We derive the Pareto class here from the
// cumulative share of total LTV — the SAME rule the backend uses (A ≤80%, B ≤95%, C
// tail) — so the badge is meaningful without a second round-trip.
const CLASS_COLOR = { A: '#16a34a', B: '#d4a437', C: '#5b616e' };

// Derive the ABC class per row from cumulative LTV share and keep the top 5.
const topWithAbc = (allRows, totalLtvHint) => {
  const totalLtv = totalLtvHint || allRows.reduce((s, r) => s + (r.ltv || 0), 0);
  let cum = 0;
  return allRows.slice(0, 5).map((r) => {
    cum += r.ltv || 0;
    const cumPct = totalLtv ? (cum / totalLtv) * 100 : 0;
    return { ...r, abc: cumPct <= 80 ? 'A' : cumPct <= 95 ? 'B' : 'C' };
  });
};

const CustTable = ({ rows, formatMoney }) => (
  <table className="w-full border-collapse">
    <tbody>
      {rows.map((r, i) => (
        <tr key={i} className="border-b border-surface-border last:border-0">
          <td className="py-1.5 pr-2">
            <span className="mr-1.5 inline-block w-[16px] text-center text-[11px] font-extrabold" style={{ color: CLASS_COLOR[r.abc] || '#5b616e' }} title={`Class ${r.abc}`}>{r.abc}</span>
            <span className="text-[12px] font-semibold text-ink">{r.name}</span>
          </td>
          <td className="py-1.5 text-right text-[12px] font-bold tabular-nums text-ink">{formatMoney(r.ltv)}</td>
          <td className="py-1.5 pl-2 text-right text-[10.5px] tabular-nums text-ink-muted">{r.gpPct != null ? `${Number(r.gpPct).toFixed(0)}% GP` : ''}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export function TopCustomersPanel({ branch, range, formatMoney = (n) => n, onView }) {
  const q = useCustomerLtv(branch, range);
  const totals = q.data?.totals || {};
  // Consolidated ALL view mixing currencies → India (₹) & Africa ($) customers kept
  // separate, each ranked & valued in its own currency. Present only then.
  const split = currencySplit(q.data);
  const rows = topWithAbc(q.data?.rows || [], totals.ltv);

  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-ink">⭐ Top Customers <span className="font-semibold text-ink-muted">· {totals.customers || 0} total</span></h3>
        {onView && <button onClick={onView} style={{ color: '#2563eb' }} className="cursor-pointer text-[11px] font-bold">View →</button>}
      </div>
      {split ? (
        split.map((c) => {
          const t = c.totals || {};
          const cRows = topWithAbc(c.rows || [], t.ltv);
          return (
            <div key={c.currency} className="mb-2 last:mb-0">
              <div className="mb-0.5 text-[11px] font-bold text-ink">{c.symbol} <span className="font-semibold text-ink-muted">({curRegion(c.symbol, c.currency)}) · {t.customers || 0} total</span></div>
              {cRows.length === 0
                ? <div className="py-2 text-center text-[11px] text-ink-muted">No customer activity.</div>
                : <CustTable rows={cRows} formatMoney={(n) => fmtCur(n, c.symbol)} />}
            </div>
          );
        })
      ) : rows.length === 0 ? (
        q.isLoading ? <div className="py-1"><SkeletonText lines={4} /></div>
          : <div className="py-3 text-center text-[11.5px] text-ink-muted">No customer activity for this period.</div>
      ) : (
        <CustTable rows={rows} formatMoney={formatMoney} />
      )}
    </div>
  );
}
