/* Shared UI constants & helpers for the unified Voucher form (Option C).
   Kept dependency-free so both the shell and the field modules can import it
   without creating an import cycle through transactions.jsx. */

export const DARK = '#141414', GOLD = '#A07828', DIM = '#5b616e',
  BLUE = '#2563eb', RED = '#C0392B', GREEN = '#1A7A42',
  V_DR = '#1A7A42', V_CR = '#C0392B';

// Digit-grouping locale per currency: ₹ → Indian lakh/crore grouping, otherwise
// Western thousands (so a USD/VAT-branch voucher isn't shown as $1,23,456).
const localeOf = (cur) => (cur === '₹' || cur === '₨' || cur === 'Rs' ? 'en-IN' : 'en-US');

// Whole-unit (no decimals) money formatter used across the voucher journal view.
export const money = (cur, n) => {
  const v = Math.round(Number(n) || 0);
  return (cur || '₹') + v.toLocaleString(localeOf(cur || '₹'));
};

// Two-decimal formatter for totals/amounts shown to the user.
export const money2 = (cur, n) =>
  (cur || '₹') + (Number(n) || 0).toLocaleString(localeOf(cur || '₹'), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

// Consolidate JV legs so each ledger shows ONCE, netted to a single Dr or Cr line
// (the side its net balance falls on) — the trade party that appears across several
// legs collapses to its final figure; single-occurrence ledgers are unchanged.
// Shared by the one JvBlock renderer used across every voucher / booking / finance view.
export function consolidateLegs(postings = []) {
  const n = (x) => (Number(x) || 0);
  const order = [], byLedger = new Map();
  for (const p of postings || []) {
    const key = (p && p.ledger) || '';
    if (!byLedger.has(key)) { byLedger.set(key, { ledger: key, group: (p && p.group) || '', debit: 0, credit: 0 }); order.push(key); }
    const e = byLedger.get(key);
    e.debit += n(p && p.debit); e.credit += n(p && p.credit);
    if (!e.group && p && p.group) e.group = p.group;
  }
  return order.map((k) => {
    const e = byLedger.get(k);
    const net = r2(e.debit - e.credit);
    return net >= 0
      ? { ledger: e.ledger, group: e.group, debit: net, credit: 0 }
      : { ledger: e.ledger, group: e.group, debit: 0, credit: r2(-net) };
  }).filter((e) => e.debit || e.credit);
}

// Branch → posting code. A real branch carries .code; "ALL" cannot post.
export const brCodeOf = (b) => (b && b !== 'ALL') ? (b.code || b) : null;

export const escHtml = (s) =>
  String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Pure bill-allocation summary — mirrors transactions.allocSummary so the
// registry (toBody/validate) can compute it without importing transactions.jsx.
// `amount` is the gross settlement value; `onAcc` is the parked advance remainder.
export function allocSummary(alloc, amount, parkOnAcc, mode) {
  // `allocated` is the NET of the entries: negative entries are adjust-credits
  // (drawing down a bill's Overpaid excess), which free extra settling capacity
  // for the positive rows — so net (not gross) is what caps at the voucher amount.
  const allocated = r2(Object.values(alloc || {}).reduce((s, v) => s + (+v || 0), 0));
  if (mode === 'onaccount') return { allocated: 0, un: 0, onAcc: r2(amount), valid: amount > 0, count: 0 };
  const un = r2(amount - allocated);
  const onAcc = (un > 0.001 && parkOnAcc) ? un : 0;
  const count = Object.values(alloc || {}).filter((v) => Math.abs(+v || 0) > 0.001).length;
  const valid = amount > 0 && count > 0 && allocated <= amount + 0.001 && (un <= 0.001 || parkOnAcc);
  return { allocated, un, onAcc, valid, count };
}

// Party dues context for the bill-wise panel — the figures an accountant checks
// before settling: how much is OVERDUE as on the voucher date (bills whose due
// date — bill date + credit days — falls on/before it), how much of that stays
// overdue after this settlement, the party's total open balance, and any OVERPAID
// credit (over-settled bills' excess — a standing credit owed back to the party,
// shown but never silently netted into the dues). Pure, so the panel and tests
// share one source of truth.
export function billDuesSummary(bills, vDate, amount) {
  const ref = (() => { const d = vDate ? new Date(vDate) : new Date(); return Number.isNaN(+d) ? new Date() : d; })();
  const isDue = (b) => { const d = new Date(b.date); if (Number.isNaN(+d)) return true; d.setDate(d.getDate() + (+b.creditDays || 0)); return d <= ref; };
  const sum = (arr) => r2(arr.reduce((s, b) => s + (+b.outstanding || 0), 0));
  const overdueAsOn = sum((bills || []).filter(isDue));
  const totalOpen = sum(bills || []);
  const overdueAfter = r2(Math.max(0, overdueAsOn - (+amount || 0)));
  const overpaidCredit = r2((bills || []).reduce((s, b) => s + (+b.overpaidAmt || 0), 0));
  return { overdueAsOn, overdueAfter, totalOpen, overpaidCredit };
}

// Whether the counter-account on a Receipt / Payment settles bill-wise, and against
// what. Returns { party, partyType, obSide, mode }:
//   Receipt + Debtor   → settle the client's open SALE bills          (mode 'bills')
//   Payment + Creditor  → settle the supplier's open PURCHASE bills    (mode 'bills')
//   Payment + Debtor    → refund the client's on-account money: settle against their
//                         open RECEIPTS (leftover per receipt)         (mode 'advances')
// Anything else (expense / loan / tax / income ledger) is a plain direct Dr/Cr entry
// with no bill-wise allocation. `obSide` is the side to query open-bills with.
export function settleSpec(side, otherType) {
  const isReceipt = side === 'customer';
  if (isReceipt && otherType === 'Debtor')   return { party: true, partyType: 'customer', obSide: 'customer', mode: 'bills' };
  if (!isReceipt && otherType === 'Creditor') return { party: true, partyType: 'supplier', obSide: 'supplier', mode: 'bills' };
  if (!isReceipt && otherType === 'Debtor')   return { party: true, partyType: 'customer', obSide: 'customer', mode: 'advances' };
  return { party: false, partyType: '', obSide: isReceipt ? 'customer' : 'supplier', mode: 'bills' };
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

// Generic voucher-editor total (the Sale / Purchase / Receipt / Payment / Contra /
// Journal rows edited in the accountingLive grid). The party leg the posting engine
// debits/credits is the FULL bill value, so the total must carry EVERY component that
// hits the books:
//   subtotal (Σ lines, Dr +ve / Cr −ve) + taxAmt (regular GST) + otherTaxesGst (the
//   SVC2 margin GST — a SEPARATE per-branch Output head) + tcsAmt (collected/recoverable,
//   rides inside total).
// Omitting otherTaxesGst made every SVC2-bearing sale read "✗ Out by <SVC2 GST>" in the
// live preview and blocked the edit from saving, even though the saved books balance.
export function editorVoucherTotal({ subtotal, taxAmt, otherTaxesGst, tcsAmt } = {}) {
  return r2((Number(subtotal) || 0) + (Number(taxAmt) || 0) + (Number(otherTaxesGst) || 0) + (Number(tcsAmt) || 0));
}

// Debit-Note totals — a purchase return with per-line Dr/Cr (like Purchase-Expense).
// Cr lines (default) reverse the cost; a Dr line is an added charge/adjustment that
// nets against them. The (reversed) input GST sits on top. Amount-canonical, so the
// form round-trips on edit exactly.
//   subtotal = Σ Cr returns − Σ Dr adjustments · gstAmt = input GST reversed
//   total    = subtotal + gstAmt   (the net we debit back to the supplier)
export function dnTotals(s) {
  const lines = (s.lines || []).filter((l) => l.ledger && (+l.amt || 0) !== 0);
  const crSum = r2(lines.filter((l) => l.drCr !== 'Dr').reduce((a, l) => a + (+l.amt || 0), 0));
  const drSum = r2(lines.filter((l) => l.drCr === 'Dr').reduce((a, l) => a + (+l.amt || 0), 0));
  const subtotal = r2(crSum - drSum);
  const gstAmt = s.gstApplicable ? r2(+s.gstAmt || 0) : 0;
  const total = r2(subtotal + gstAmt);
  return { crSum, drSum, subtotal, gstAmt, total };
}
