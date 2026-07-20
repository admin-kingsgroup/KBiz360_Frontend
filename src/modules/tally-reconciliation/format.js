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
// Zero-vs-absent reads as tied — mirrors the backend `statusOf` (a zero-balance
// ledger the Tally export omits is not a blocking difference).
export const statusOf = (e, t) => {
  const ev = e === null ? 0 : e; const tv = t === null ? 0 : t;
  if (round2(ev - tv) === 0) return 'tied';
  if (e === null) return 'only-tally';
  if (t === null) return 'only-erp';
  return 'off';
};

// Tally reconciliation is a CENTRAL Month/Year control (AE / FM / Director /
// Owner). Mirrors the backend role gate EXACTLY, including its Branch-Accountant-
// first precedence — used to self-guard the board on a direct URL for a role that
// shouldn't reach it. (A "Branch Accountant (AE)" string must resolve to BA, not AE.)
export const isCentralRole = (role) => {
  const r = String(role || '');
  if (/branch\s*account/i.test(r)) return false;
  return /account.*(exec|executive)|(^|[^a-z])ae([^a-z]|$)|finance\s*manager|(^|[^a-z])fm([^a-z]|$)|director|owner|super[\s_-]*admin/i.test(r);
};

// Re-opening a certified period reverses sign-offs → APPROVER-ONLY. Mirrors the
// backend gate roleSatisfies(role,'Director') = Director or Owner (Owner via Rule 07),
// with the same Branch-Accountant-first precedence as isCentralRole.
export const isApproverRole = (role) => {
  const r = String(role || '');
  // Same precedence as the backend normalizeRole: a lower role wins even if the
  // string also contains "director"/"owner" (e.g. a dual "FM / Director" label),
  // so the FE never shows Re-open where the backend would 403.
  if (/branch\s*account/i.test(r)) return false;
  if (/account.*(exec|executive)|(^|[^a-z])ae([^a-z]|$)/i.test(r)) return false;
  if (/finance\s*manager|(^|[^a-z])fm([^a-z]|$)/i.test(r)) return false;
  return /director|owner|super[\s_-]*admin/i.test(r);
};

// Posting a rounding settlement moves the BOOKS, so it is approver-grade but one
// rung lower than re-open: mirrors the backend roleSatisfies(role,'FM') — FM,
// Director or Owner. Same Branch-Accountant-first / AE precedence as the others.
export const isSettlerRole = (role) => {
  const r = String(role || '');
  if (/branch\s*account/i.test(r)) return false;
  if (/account.*(exec|executive)|(^|[^a-z])ae([^a-z]|$)/i.test(r)) return false;
  return /finance\s*manager|(^|[^a-z])fm([^a-z]|$)|director|owner|super[\s_-]*admin/i.test(r);
};

export const STATUS_META = {
  tied: { tone: 'success', label: 'Tied' },
  // A definitionally-rounding head (Round Off, or the synthetic Profit & Loss A/c b/f): a
  // sub-rupee residue tolerated as rounding — non-blocking, but shown so it is never silent.
  // Mirrors the backend buildTieOut `rounding` status.
  rounding: { tone: 'info', label: 'Rounding' },
  off: { tone: 'danger', label: 'Off' },
  matched: { tone: 'success', label: 'Matched' },
  'amount-diff': { tone: 'danger', label: 'Amount differs' },
  'only-erp': { tone: 'warning', label: 'Only in ERP' },
  'only-tally': { tone: 'warning', label: 'Only in Tally' },
};
export const statusMeta = (s) => STATUS_META[s] || STATUS_META.tied;

// Certificate lifecycle status → badge (shared by the Register + Report pages and
// the period-selector marker). 'none' = no certificate started for the period.
export const CERT_META = {
  locked:     { tone: 'navy',    label: 'Certified',        icon: '🔒' },
  signed:     { tone: 'success', label: 'Signing…',         icon: '✍' },
  reconciled: { tone: 'info',    label: 'Ready to certify', icon: '✓' },
  open:       { tone: 'warning', label: 'Not tied',         icon: '•' },
  none:       { tone: 'muted',   label: 'Not started',      icon: '–' },
};
export const certMeta = (s) => CERT_META[s] || CERT_META.none;
export const TALLY_CHAIN = ['AE', 'FM', 'Director', 'Owner'];

// Defect type → tone + short label + tier (Defect Register). `tier` splits the
// defects into two triage cuts: 'master' = the whole ledger is absent on one
// side (chart/mapping fix), 'voucher' = a posting inside a ledger that exists on
// both sides (data-entry/correction fix).
export const DEFECT_META = {
  'missing-in-tally': { tone: 'warning', label: 'In ERP, not Tally', tier: 'voucher' },
  'missing-in-erp': { tone: 'warning', label: 'In Tally, not ERP', tier: 'voucher' },
  'amount-mismatch': { tone: 'danger', label: 'Amount differs', tier: 'voucher' },
  'ledger-missing-tally': { tone: 'warning', label: 'Ledger absent in Tally', tier: 'master' },
  'ledger-missing-erp': { tone: 'warning', label: 'Ledger absent in ERP', tier: 'master' },
};
export const defectMeta = (t) => DEFECT_META[t] || { tone: 'danger', label: t, tier: 'voucher' };
