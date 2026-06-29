import React from 'react';
import { useBalanceSheet, useTaxSummary } from '../../../../core/useAccounting';

// ⑤ Financial position — Balance Sheet health (Total Assets vs Total Liabilities +
// Equity, with a balanced ✓ / out-of-balance ⚠ check) plus the period's GST/VAT net
// (payable or refundable). As-of range.to. Self-contained: own queries + loading.
export function BalanceHealthPanel({ branch, range, formatMoney = (n) => n, onView, onViewTax }) {
  const bs = useBalanceSheet(branch, { to: range.to }).data || {};
  const tax = useTaxSummary(branch, range).data || {};
  const assetTotal = (bs.assets || []).reduce((s, a) => s + (a.amount || 0), 0);
  const liabTotal = (bs.liabilities || []).reduce((s, a) => s + (a.amount || 0), 0);
  const diff = assetTotal - liabTotal;
  const balanced = Math.abs(diff) < 1;
  const netTax = tax.netPayable || 0;
  const hasBs = assetTotal !== 0 || liabTotal !== 0;

  const stat = (label, val) => (
    <div className="min-w-[120px]">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="text-[14px] font-bold tabular-nums text-ink">{formatMoney(val)}</div>
    </div>
  );

  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-ink">🧮 Financial Position <span className="font-semibold text-ink-muted">· as of {range.to}</span></h3>
        {onView && <button onClick={onView} style={{ color: '#2563eb' }} className="cursor-pointer text-[11px] font-bold">Balance Sheet →</button>}
      </div>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
        {stat('Total Assets', assetTotal)}
        {stat('Liabilities + Equity', liabTotal)}
      </div>
      {hasBs && (
        <div
          className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold"
          style={balanced
            ? { color: '#16a34a', background: '#ecfdf5', border: '1px solid #bbf7d0' }
            : { color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}
        >
          {balanced ? '✓ Balanced' : `⚠ Out of balance by ${formatMoney(Math.abs(diff))}`}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-surface-border pt-2.5">
        <span className="text-[11.5px] font-semibold text-ink-muted">GST / VAT Net</span>
        <span className="inline-flex items-center gap-2">
          <span className="text-[13px] font-bold tabular-nums" style={{ color: netTax > 0 ? '#dc2626' : '#16a34a' }}>{formatMoney(Math.abs(netTax))}</span>
          <span className="text-[10.5px] font-semibold text-ink-muted">{netTax >= 0 ? 'payable' : 'refundable'}</span>
          {onViewTax && <button onClick={onViewTax} style={{ color: '#2563eb' }} className="cursor-pointer text-[11px] font-bold">Tax →</button>}
        </span>
      </div>
    </div>
  );
}
