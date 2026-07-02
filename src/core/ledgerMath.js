// ───────────────────────────────────────────────────────────────────────────
// Pure ledger math/formatting/mapping — NO React, NO side effects.
// Extracted from ledgerUI.jsx so it can be unit-tested in isolation (Jest) and
// reused anywhere. Keep this file dependency-free.
// ───────────────────────────────────────────────────────────────────────────

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export const fmt = (n) => (n ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
export const fmtB = (n) => Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dmy = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('-') : '');

export const VT_LABEL = {
  sale: 'Sales', purchase: 'Purchase', receipt: 'Receipt', payment: 'Payment', contra: 'Contra',
  journal: 'Journal', 'debit-note': 'Debit Note',
  'purchase-expense': 'Purch. Exp', refund: 'Refund', reissue: 'Reissue',
};
export const vtLabel = (c) => VT_LABEL[c] || String(c || '').replace(/\b\w/g, (m) => m.toUpperCase());

// A party ledger (Sundry Debtor/Creditor) is the only kind that carries bill-wise
// outstanding. Decide the open-bills "side" from its group.
export function billwiseSide(group = '') {
  const g = String(group).toLowerCase();
  if (g.includes('debtor')) return 'customer';
  if (g.includes('creditor')) return 'supplier';
  return null;
}
export const isBillwiseLedger = (group) => !!billwiseSide(group);

// Live ledger-statement payload → the row model the ledger UI renders.
export function mapLedger(d) {
  if (!d) return null;
  return {
    name: d.ledger, group: d.group, code: d.code,
    // Primary (top) system group from the backend — bill-wise is decided by this
    // (Sundry Debtors/Creditors), not the immediate sub-group name.
    primaryGroup: d.primaryGroup || d.group,
    opening: { amt: d.openingBalance || 0, side: d.openingSide || 'Dr' },
    rows: (d.lines || []).map((e) => ({
      date: e.date, vno: e.vno, tallyRef: e.sourceRef || '', voucherId: e.voucherId, branch: e.branch || '', category: e.category || e.type || '',
      part: (e.particulars && e.particulars[0] && e.particulars[0].ledger) || e.party || vtLabel(e.category),
      toBy: e.debit > 0 ? 'To' : 'By',
      vt: vtLabel(e.category || e.type),
      dr: e.debit || 0, cr: e.credit || 0,
      narr: e.narration || e.entryNarration || '',
      detail: (e.particulars || []).map((p) => ({ n: p.ledger, side: p.side, amt: p.amount })),
      // Bill-wise settlement (which bills this receipt/payment/note knocked off).
      alloc: (e.allocations || []).map((a) => ({ ref: a.billVno, amt: a.amount })),
      // Reverse view (party-ledger bill lines): which settlements knocked THIS bill off,
      // plus its settled / pending split (drives the Settled/Part/Open pill).
      settledBy: (e.settledBy || []).map((x) => ({ ref: x.vno, amt: x.amount, date: x.date, cat: x.category })),
      settled: e.settled != null ? e.settled : null,
      pending: e.pending != null ? e.pending : null,
      balance: e.balance, balanceSide: e.balanceSide,
    })),
    totalDebit: d.totalDebit || 0, totalCredit: d.totalCredit || 0,
    closing: { amt: d.closingBalance || 0, side: d.closingSide || 'Dr' },
  };
}

// Live open-bills payload → bill-wise rows.
export function mapBills(bw) {
  const list = (bw && bw.bills) || [];
  return list.map((b) => ({
    ref: b.billVno, bdate: b.date, amt: b.total || 0, settled: b.allocated || 0,
    pend: (b.outstanding != null) ? b.outstanding : ((b.total || 0) - (b.allocated || 0)),
    age: b.ageDays || 0, status: b.status || '',
  }));
}

// Group a ledger's rows by branch, preserving first-appearance order (consolidated
// TK HO Group view — each branch is its own segment; books are never blended).
export function groupByBranch(rows) {
  const m = new Map();
  (rows || []).forEach((r) => { const b = r.branch || '—'; if (!m.has(b)) m.set(b, []); m.get(b).push(r); });
  return [...m.entries()].map(([branch, rs]) => ({ branch, rows: rs }));
}
export const branchSeg = (code) => (!code || code === '—' || code === 'ALL') ? 'Unspecified' : code;

export const AGE_BUCKETS = ['Not Due', '0-30', '31-60', '61-90', '90+'];
export const AGE_COLORS = { 'Not Due': '#2C5C8F', '0-30': '#1B6B4C', '31-60': '#B7791F', '61-90': '#C0651A', '90+': '#9B2C2C' };
export function ageingOf(bills) {
  const age = { 'Not Due': 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  let totPend = 0;
  (bills || []).forEach((b) => {
    if (b.pend <= 0) return;
    totPend += b.pend;
    const d = b.age;
    if (d <= 0) age['Not Due'] += b.pend;
    else if (d <= 30) age['0-30'] += b.pend;
    else if (d <= 60) age['31-60'] += b.pend;
    else if (d <= 90) age['61-90'] += b.pend;
    else age['90+'] += b.pend;
  });
  return { age, totPend };
}
