// ─── GSTR-2B · pure helpers ──────────────────────────────────────────────────

export const BRANCHES = ['BOM', 'AMD', 'MHUB', 'NBO', 'DAR', 'FBM'];

export function defaultPeriod(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return m === 0 ? `${y - 1}-12` : `${y}-${String(m).padStart(2, '0')}`;
}

/** Input credit on a line = igst + cgst + sgst + cess. */
export function itcOf(r) {
  return (Number(r.igst) || 0) + (Number(r.cgst) || 0) + (Number(r.sgst) || 0) + (Number(r.cess) || 0);
}

export function statusTone(s) {
  return { matched: 'success', unmatched: 'warning', mismatch: 'danger' }[s] || 'neutral';
}

/** Roll rows into counts + total ITC for the header tiles. */
export function summarize(rows) {
  const s = { total: (rows || []).length, matched: 0, unmatched: 0, mismatch: 0, itc: 0 };
  (rows || []).forEach((r) => { s[r.status] = (s[r.status] || 0) + 1; s.itc += itcOf(r); });
  return s;
}
