/* Shared UI constants & helpers for the unified Voucher form (Option C).
   Kept dependency-free so both the shell and the field modules can import it
   without creating an import cycle through transactions.jsx. */

export const DARK = '#1a1c22', GOLD = '#c2a04a', DIM = '#5b616e',
  BLUE = '#2563eb', RED = '#dc2626', GREEN = '#16a34a',
  V_DR = '#16a34a', V_CR = '#dc2626';

// Whole-rupee (no decimals) money formatter used across the voucher journal view.
export const money = (cur, n) => {
  const v = Math.round(Number(n) || 0);
  return (cur || '₹') + v.toLocaleString('en-IN');
};

// Two-decimal formatter for totals/amounts shown to the user.
export const money2 = (cur, n) =>
  (cur || '₹') + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

// Branch → posting code. A real branch carries .code; "ALL" cannot post.
export const brCodeOf = (b) => (b && b !== 'ALL') ? (b.code || b) : null;

export const escHtml = (s) =>
  String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Pure bill-allocation summary — mirrors transactions.allocSummary so the
// registry (toBody/validate) can compute it without importing transactions.jsx.
// `amount` is the gross settlement value; `onAcc` is the parked advance remainder.
export function allocSummary(alloc, amount, parkOnAcc, mode) {
  const allocated = r2(Object.values(alloc || {}).reduce((s, v) => s + (+v || 0), 0));
  if (mode === 'onaccount') return { allocated: 0, un: 0, onAcc: r2(amount), valid: amount > 0, count: 0 };
  const un = r2(amount - allocated);
  const onAcc = (un > 0.001 && parkOnAcc) ? un : 0;
  const count = Object.values(alloc || {}).filter((v) => (+v || 0) > 0).length;
  const valid = amount > 0 && allocated > 0 && allocated <= amount + 0.001 && (un <= 0.001 || parkOnAcc);
  return { allocated, un, onAcc, valid, count };
}

// Purchase-Expense totals from its line grid. Debit lines (expense/asset) add to
// the taxable value; credit lines (e.g. Discount Received) subtract. GST and TDS
// are amount-canonical (stored as amounts), so this round-trips exactly.
export function pxpTotals(s) {
  const lines = (s.lines || []).filter((l) => l.ledger && (+l.amt || 0) !== 0);
  const drSum = r2(lines.filter((l) => l.drCr !== 'Cr').reduce((a, l) => a + (+l.amt || 0), 0));
  const crSum = r2(lines.filter((l) => l.drCr === 'Cr').reduce((a, l) => a + (+l.amt || 0), 0));
  const taxable = r2(drSum - crSum);
  const gstAmt = s.gstApplicable ? r2(+s.gstAmt || 0) : 0;
  const tds = r2(+s.tdsAmt || 0);
  const total = r2(taxable + gstAmt);
  return { drSum, crSum, taxable, gstAmt, tds, total };
}
