// Shared formatting for the Tally Reconciliation module — branch currency,
// signed Dr/Cr display, and the tie/off status vocabulary. Kept in one place so
// the board, the voucher drawer and the Defect Register read identically.

export const BRANCHES = ['BOM', 'AMD', 'BOMMB', 'NBO', 'DAR', 'FBM'];
export const AFRICA = new Set(['NBO', 'DAR', 'FBM']);
export const CUR = { BOM: '₹', AMD: '₹', BOMMB: '₹', NBO: '$', DAR: '$', FBM: '$' };
export const localeOf = (c) => (c === '₹' ? 'en-IN' : 'en-US');
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function branchCodeOf(b) { const c = typeof b === 'object' && b ? b.code : b; return BRANCHES.includes(c) ? c : ''; }

/** Signed amount as "12,45,300 Dr" / "9,000 Cr"; null → "—"; 0 → "0". */
export function fmt(v, cur) {
  if (v === null || v === undefined) return '—';
  if (v === 0) return '0';
  return `${Math.abs(v).toLocaleString(localeOf(cur), { maximumFractionDigits: 2 })} ${v >= 0 ? 'Dr' : 'Cr'}`;
}
/** Plain grouped magnitude (no side) — for difference/variance cells. */
export const grp = (v, cur) => Math.abs(Number(v) || 0).toLocaleString(localeOf(cur), { maximumFractionDigits: 2 });

export const statusOf = (e, t) => (e === null ? 'only-tally' : t === null ? 'only-erp' : round2((e || 0) - (t || 0)) === 0 ? 'tied' : 'off');

export const STATUS_META = {
  tied: { tone: 'success', label: 'Tied' },
  off: { tone: 'danger', label: 'Off' },
  matched: { tone: 'success', label: 'Matched' },
  'amount-diff': { tone: 'danger', label: 'Amount differs' },
  'only-erp': { tone: 'warning', label: 'Only in ERP' },
  'only-tally': { tone: 'warning', label: 'Only in Tally' },
};
export const statusMeta = (s) => STATUS_META[s] || STATUS_META.tied;

// Defect type → tone + short label (Defect Register).
export const DEFECT_META = {
  'missing-in-tally': { tone: 'warning', label: 'In ERP, not Tally' },
  'missing-in-erp': { tone: 'warning', label: 'In Tally, not ERP' },
  'amount-mismatch': { tone: 'danger', label: 'Amount differs' },
  'ledger-missing-tally': { tone: 'warning', label: 'Ledger absent in Tally' },
  'ledger-missing-erp': { tone: 'warning', label: 'Ledger absent in ERP' },
};
export const defectMeta = (t) => DEFECT_META[t] || { tone: 'danger', label: t };
