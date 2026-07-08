/* Pure transformers for the finance feature — no React, no I/O, easy to unit-test.
   The service layer is the only thing that calls these. */

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * Normalise a trial-balance row. A not-yet-redeployed backend may return only
 * period `debit` / `credit` (no opening/closing columns). Map that onto the
 * full 6-column shape so the screen renders consistently either way — same
 * fallback `TrialBalanceLive` used before the migration.
 */
export function normalizeTrialBalanceRow(r) {
  const hasClosing = r.closingDebit != null || r.closingCredit != null;
  if (hasClosing) {
    return {
      group: r.group || '—',
      code: r.code || '',
      ledger: r.ledger || '—',
      openingDebit: num(r.openingDebit),
      openingCredit: num(r.openingCredit),
      debit: num(r.debit),
      credit: num(r.credit),
      closingDebit: num(r.closingDebit),
      closingCredit: num(r.closingCredit),
    };
  }
  return {
    group: r.group || '—',
    code: r.code || '',
    ledger: r.ledger || '—',
    openingDebit: 0,
    openingCredit: 0,
    debit: 0,
    credit: 0,
    closingDebit: num(r.debit),
    closingCredit: num(r.credit),
  };
}

export const TB_TOTAL_KEYS = ['openingDebit', 'openingCredit', 'debit', 'credit', 'closingDebit', 'closingCredit'];

/** Column-wise totals across a row set (rounded). */
export function trialBalanceTotals(rows = []) {
  const t = {};
  for (const k of TB_TOTAL_KEYS) t[k] = Math.round(rows.reduce((s, r) => s + num(r[k]), 0));
  return t;
}

/**
 * Map a raw voucher into a flat register row. Receipt/payment/contra/journal
 * vouchers usually have no `party` (they move money between ledgers), so the
 * displayed "account" falls back to billTo → counterParty → the first line's
 * ledger. Narration prefers the top-level remarks, then the first line desc.
 *
 * Amount prefers `partyNet` (refund vouchers only): the net actually POSTED to the
 * party in the journal — a full-reversal refund nets its debtor leg, so the header
 * `total` (gross) is not what the ledger (or the JV view) shows.
 */
export function toVoucherRegisterRow(v = {}) {
  const lines = Array.isArray(v.lines) ? v.lines : [];
  const firstLedger = (lines.find((l) => l && l.ledger) || {}).ledger || '';
  return {
    id: v.id,
    vno: v.vno || '—',
    tallyRef: v.sourceRef || '',   // original Tally voucher no (migrated entries)
    date: v.date || '',
    branch: v.branch || '',
    account: v.party || v.billTo || v.counterParty || firstLedger || '—',
    narration: v.remarks || (lines[0] && lines[0].desc) || '',
    amount: num(v.partyNet) || num(v.total) || num(v.subtotal),
    status: v.status || '',
    mode: v.paymentMode || '',
  };
}
