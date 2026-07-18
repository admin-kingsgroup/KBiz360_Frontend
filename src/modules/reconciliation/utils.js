// ─── Reconciliation module · pure helpers ────────────────────────────────────
// Tier metadata (labels, signer chains, colors), status→tone mapping, currency
// per branch and progress math. Everything here is pure and unit-tested — the
// components stay thin over these.
import { localeOf } from '../../core/format';

export const BRANCHES = ['BOM', 'AMD', 'BOMMB', 'NBO', 'DAR', 'FBM'];

/** The app passes `branch` as either a code string OR a branch OBJECT
 *  ({code, city…}) — and 'ALL' in group mode. Normalize to a valid code or ''. */
export function branchCodeOf(branch) {
  const code = typeof branch === 'object' && branch !== null ? branch.code : branch;
  return BRANCHES.includes(code) ? code : '';
}

// FE currency map — mirrors the BOOKS currency. ALL 3 Africa branches keep their
// books in USD ($); KES/TZS are print-only secondary currencies (NBO/DAR local
// invoice printing), never a books/report currency. FBM is USD-only.
export const BRANCH_CURRENCY = { BOM: '₹', AMD: '₹', BOMMB: '₹', NBO: '$', DAR: '$', FBM: '$' };
export const currencyOf = (branch) => BRANCH_CURRENCY[branch] || '₹';

// The five tiers — kept in ladder order. `chain` mirrors the backend service
// (the server is authoritative; this copy only drives labels and the Rule Book).
// SOFT tiers (Daily/Weekly) are BRANCH-level, freeze-only (no certification);
// HARD tiers (Month/Quarter/Year) are TK-Group certification.
export const TIERS = [
  {
    key: 'daily', short: 'Daily', label: 'Daily — Freeze', mode: 'digital',
    cadence: 'Every working day', tone: 'neutral',
    scope: 'Cash-movement ledgers — bank · cash · BSP · online B2B suppliers',
    lock: 'Soft — freeze only; the AE approves the day. No certification',
    chain: [
      { role: 'Branch Accountant', action: 'Prepared' },
      { role: 'AE', action: 'Approved' },
    ],
  },
  {
    key: 'weekly', short: 'Weekly', label: 'Weekly — Freeze & Approve', mode: 'digital',
    cadence: 'Every BSP cycle (~weekly)', tone: 'success',
    scope: 'Cycle ledgers — bank · cash · BSP · online B2B suppliers',
    lock: 'Soft — freeze only; AE then FM approve. No certification',
    chain: [
      { role: 'Branch Accountant', action: 'Prepared' },
      { role: 'AE', action: 'Verified' },
      { role: 'FM', action: 'Approved' },
    ],
  },
  {
    key: 'month', short: 'Month-End', label: 'Month-End — Certify & Lock', mode: 'physical',
    cadence: 'Monthly', tone: 'info',
    scope: 'All Balance-Sheet ledgers — client, supplier, tax, loans, capital, assets',
    lock: 'Hard — the Owner lock fires the period lock',
    chain: [
      { role: 'AE', action: 'Prepared' },
      { role: 'FM', action: 'Verified' },
      { role: 'Director', action: 'Certified' },
      { role: 'Owner', action: 'Locked' },
    ],
  },
  {
    key: 'quarter', short: 'Quarterly', label: 'Quarterly — Certify & Lock', mode: 'physical',
    cadence: 'Quarterly — India fiscal (Apr–Mar) · Africa calendar (Jan–Dec)', tone: 'gold',
    scope: '+ statutory filings · inter-branch elimination · provisions · facilities',
    lock: 'Hard — quarter lock',
    chain: [
      { role: 'AE', action: 'Prepared' },
      { role: 'FM', action: 'Verified' },
      { role: 'Director', action: 'Certified' },
      { role: 'Owner', action: 'Locked' },
    ],
  },
  {
    key: 'year', short: 'Year-End', label: 'Year-End — Certify & Lock', mode: 'physical',
    cadence: 'Annually — India FY (Apr–Mar) · Africa calendar year (Jan–Dec)', tone: 'warning',
    scope: '+ closing entries · carry-forward · annual statutory · external confirmations · audit',
    lock: 'Hard — the Owner lock; reopening needs a formal restatement',
    chain: [
      { role: 'AE', action: 'Prepared' },
      { role: 'FM', action: 'Verified' },
      { role: 'Director', action: 'Certified' },
      { role: 'Owner', action: 'Locked' },
    ],
  },
];
export const tierOf = (key) => TIERS.find((t) => t.key === key) || TIERS[0];
// Branch-level freeze-only tiers vs TK-Group certification tiers.
export const isSoftTier = (key) => key === 'daily' || key === 'weekly';
export const isHardTier = (key) => key === 'month' || key === 'quarter' || key === 'year';

// ── Month-End: branch freeze vs Group certify (per-ledger chain) ─────────────
// Mirrors the backend chainFor: a MONTH statement ledger (bank/client/supplier —
// the heads with a reconciliation screen) is FROZEN at the branch by the Branch
// Accountant, then certified at TK Group — so its chain gains a Branch-Accountant
// "Prepared" step and the AE's step becomes a verify of that freeze. Every other
// month head (tax/loans/capital/assets) keeps the tier's AE-first chain. Statement
// ledgers are identified by their resolved SYSTEM sub-group (what the cert stores).
export const MONTH_STATEMENT_CHAIN = [
  { role: 'Branch Accountant', action: 'Prepared' },
  { role: 'AE', action: 'Verified' },
  { role: 'FM', action: 'Verified' },
  { role: 'Director', action: 'Certified' },
  { role: 'Owner', action: 'Locked' },
];
const STATEMENT_SUBGROUPS = new Set(['Bank Accounts', 'Bank OD Accounts', 'Sundry Debtors', 'Sundry Creditors']);
export function isStatementLedgerCert(cert = {}) {
  return STATEMENT_SUBGROUPS.has(String(cert?.ledger?.subGroup || '').trim());
}
/** The signing chain for THIS certificate — the tier's chain, except a MONTH
 *  statement-ledger cert runs on MONTH_STATEMENT_CHAIN (branch freeze → Group
 *  certify). Authoritative copy lives on the backend (getCertificate.chain). */
export function chainForCert(cert = {}) {
  if (cert?.tier === 'month' && isStatementLedgerCert(cert)) return MONTH_STATEMENT_CHAIN;
  return tierOf(cert?.tier).chain;
}
/** Signer summary for a tier's register subtitle. Month splits by ledger type. */
export function tierSignersLabel(tierKey) {
  if (tierKey === 'month') {
    return 'Branch Accountant → AE → FM → Director → Owner (bank/client/supplier, frozen at branch) · AE → FM → Director → Owner (other heads, at TK Group)';
  }
  return tierOf(tierKey).chain.map((s) => s.role).join(' → ');
}

// Each tier is its OWN menu entry + page now. THREE per-tier page families, each
// chosen from the menu (never from tabs inside a page):
//   • Reconciliation Hub  → /reconciliation/hub/<tier>      — full-view dashboard
//   • Certification       → /reconciliation/<tier>          — the sign-off register
//   • Reports             → /reconciliation/reports/<tier>  — the tier's report
export const TIER_PATHS = { daily: 'daily', weekly: 'weekly', month: 'monthly', quarter: 'quarterly', year: 'yearly' };
export const hubPathFor = (tierKey) => `/reconciliation/hub/${TIER_PATHS[tierKey] || 'weekly'}`;
export const certPathFor = (tierKey) => `/reconciliation/${TIER_PATHS[tierKey] || 'weekly'}`;
export const reportPathFor = (tierKey) => `/reconciliation/reports/${TIER_PATHS[tierKey] || 'weekly'}`;
// Page headings match the MENU ENTRY the user clicked (Weekly/Monthly/Quarterly/
// Yearly …) — tier.short stays the tier's formal name (Month-End, Year-End) on
// cards, badges and the Rule Book.
export const tierMenuName = (tierKey) => ({ daily: 'Daily', weekly: 'Weekly', month: 'Monthly', quarter: 'Quarterly', year: 'Yearly' }[tierKey] || 'Weekly');

/** Tiers a role may see/work. The Branch Accountant handles the DAILY & WEEKLY
 *  freeze AND the MONTHLY bank/client/supplier freeze — Quarter/Year certification
 *  is done from TK Group Central by AE/FM/Director/Owner (the backend enforces the
 *  same rule on writes; within the month register the BA can only freeze the
 *  statement heads, the other heads are gated with a reason). */
export function visibleTiers(role) {
  if (!/accountant/i.test(String(role || ''))) return TIERS;
  return TIERS.filter((t) => isSoftTier(t.key) || t.key === 'month');
}

/** The weekly cycle CONFIG (wallets/gateways joining the cycle) is a control:
 *  FM / Director / Owner maintain it — AE verifies certificates, never
 *  reshapes the scope. Mirrors the backend gate exactly. */
export function canEditCycleConfig(role) {
  return /finance\s*manager|(^|[^a-z])fm([^a-z]|$)|director|owner|super[\s_-]*admin/i.test(String(role || ''));
}

// Certificate status → Badge tone + label. `pending` is a HUB-only synthetic
// status: the ledger is in scope but its certificate has not been generated yet
// (amber = outstanding / not started) — the sign-off register never shows it.
export const STATUS_META = {
  pending:    { tone: 'warning', label: 'Pending' },
  open:       { tone: 'neutral', label: 'Open' },
  reconciled: { tone: 'info',    label: 'Reconciled' },
  signed:     { tone: 'success', label: 'Signed' },
  locked:     { tone: 'navy',    label: 'Locked' },
};
export const statusMeta = (s) => STATUS_META[s] || STATUS_META.open;

// Attachment source → tone + label (physical scan vs portal download vs feed).
export const SOURCE_META = {
  physical: { tone: 'warning', label: 'Physical scan' },
  download: { tone: 'info',    label: 'Download' },
  feed:     { tone: 'success', label: 'Bank feed' },
  internal: { tone: 'neutral', label: 'Internal' },
};
export const sourceMeta = (s) => SOURCE_META[s] || SOURCE_META.download;

/** Progress over a tier's rows: done = signed + locked. */
export function tierProgress(counts = {}) {
  const total = Number(counts.total) || 0;
  const done = (Number(counts.signed) || 0) + (Number(counts.locked) || 0);
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Signature progress on one certificate: "2 / 4 · next: FM". Uses the cert's
 *  RESOLVED chain (a month statement ledger has the branch-freeze step). */
export function chainProgress(cert) {
  const chain = chainForCert(cert);
  const done = (cert?.signatures || []).length;
  const next = chain[done] || null;
  return { done, total: chain.length, next };
}

/** Formatted amount with the branch currency symbol ('' for null). Grouping follows
 *  the currency — Indian lakh/crore for ₹, Western thousands for the USD branches
 *  (never `$ 1,25,000`) — via the shared core/format localeOf resolver. */
export function fmtAmt(n, branch) {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '—';
  const cur = currencyOf(branch);
  return `${cur} ${Number(n).toLocaleString(localeOf(cur), { maximumFractionDigits: 2 })}`;
}

/** Count of unresolved exceptions on a certificate. */
export const openExceptions = (cert) => (cert?.exceptions || []).filter((e) => !e.resolved).length;

// Classification vocabularies by scrutiny perspective: bank statements use the
// BRS language; supplier/client SOAs ('party') use the trade language. The
// backend enforces the same split.
export const BANK_CLASSIFY = [
  { value: 'unpresented', label: 'Unpresented cheque' },
  { value: 'in-transit', label: 'Deposit in transit' },
  { value: 'to-post', label: 'Charge/credit to post' },
  { value: 'other', label: 'Other reconciling item' },
];
export const PARTY_CLASSIFY = [
  { value: 'invoice-not-received', label: 'Invoice not received' },
  { value: 'payment-in-transit', label: 'Payment in transit' },
  { value: 'tds-deduction', label: 'TDS deduction' },
  { value: 'credit-note-pending', label: 'Credit note / ADM pending' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'rate-difference', label: 'Rate difference' },
  { value: 'other', label: 'Other reconciling item' },
];
export const classifyOptionsFor = (perspective) => (perspective === 'party' ? PARTY_CLASSIFY : BANK_CLASSIFY);
export const classificationLabel = (value) => [...BANK_CLASSIFY, ...PARTY_CLASSIFY].find((c) => c.value === value)?.label || value;

/** Friendly chip text for special match types. */
export const MATCH_TYPE_LABELS = {
  ref: 'ref match', 'ref:amount-differs': 'rate difference', learned: 'learned',
  'explained-deduction': 'TDS-explained', 'carry-cleared': 'carried · cleared',
};

/** Period choices for a tier's register: the CURRENT period plus every pending
 *  backlog period of that tier (Apr/May/Jun 2026 closings, FY2025-26 / CY2025
 *  year-end…), deduped, backlog first (oldest obligation on top). */
export function periodOptions(tierKey, currentPeriod, pendingRows = []) {
  const backlog = (pendingRows || [])
    .filter((r) => r.tier === tierKey && r.period && r.period !== currentPeriod && !r.upcoming)
    .map((r) => ({ value: r.period, label: `${r.period} — pending` }));
  const out = [...backlog];
  if (currentPeriod) out.push({ value: currentPeriod, label: `${currentPeriod} — current` });
  return out.filter((o, i) => out.findIndex((x) => x.value === o.value) === i);
}

/** Pending-closings row state → badge tone + label. */
export function pendingStateMeta(row = {}) {
  if (row.upcoming) return { tone: 'info', label: 'Upcoming' };
  if (row.state === 'closed') return { tone: 'navy', label: 'Closed' };
  if (row.state === 'in-progress') return { tone: 'warning', label: 'In progress' };
  return { tone: 'danger', label: 'Pending' };
}

/** Due-date cell for a pending row: weekly cycles show their FRIDAY. */
export function fmtDue(row = {}) {
  if (!row.dueOn) return row.tier === 'weekly' ? 'Friday' : '—';
  const d = new Date(`${row.dueOn}T00:00:00Z`);
  const s = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return row.upcoming ? `${s} (upcoming)` : s;
}

// The Golden Rules — the Rule Book page renders these (kept with the tier data
// so the whole policy reads from one file).
export const GOLDEN_RULES = [
  { n: '01', title: 'One ledger, one certificate', text: 'Each ledger is reconciled and certified on its own at every tier it applies to. A period locks only when ALL its ledgers are signed.' },
  { n: '02', title: 'Freeze before sign', text: 'Balances are snapshot-frozen and every uploaded statement is hash-tied to that snapshot — the signature always points at the exact figures reconciled.' },
  { n: '03', title: 'No sign on open exceptions', text: 'A certificate cannot be signed while its reconciliation shows an unresolved exception. Unresolved items escalate up the tiers.' },
  { n: '04', title: 'Branch freezes, Group certifies', text: 'Daily & Weekly are FREEZE-ONLY at the branch (Branch Accountant freezes; AE — and FM, weekly — approve). At Month-End the Branch Accountant ALSO freezes the branch bank / client / supplier reconciliations; TK Group then certifies them (AE verifies → FM verifies → Director certifies → Owner locks). The month’s other heads (tax, loans, capital, assets) and all Quarter/Year certification are prepared and certified at TK Group Central. Nothing hard-locks at branch level.' },
  { n: '05', title: 'Physical = scan back', text: 'Month/Quarter/Year are wet-signed on paper, then the signed scan is uploaded — that upload is what fires the period lock.' },
  { n: '06', title: 'Branch-wise, never mixed', text: 'Every reconciliation is per branch. TK Group certifies each branch on its own; balances are never merged across branches. Tally Reconciliation is a TK Group Central activity only.' },
  { n: '07', title: 'Delegation, not bottleneck', text: 'If the Director is unavailable, the Owner signs the certify step in his place (within approval limits) so a close is never stuck.' },
  { n: '08', title: 'Locked stays locked', text: 'A locked period is re-opened ONLY by the Owner; during the correction window only the FM may edit, then it is re-certified up the chain. Records retained 8 years.' },
];

// Who-does-what rows for the Rule Book roles table.
export const ROLE_MATRIX = [
  { role: 'Branch Accountant', who: 'At each branch', duty: 'Freezes every cycle ledger daily & weekly, and the monthly bank/client/supplier reconciliations, at the branch (reconciles + prepares); no certification', daily: 'Freeze', weekly: 'Freeze', month: 'Freeze¹', quarter: '—', year: '—' },
  { role: 'AE', who: 'Accounts Executive', duty: 'Approves the daily/weekly freeze at Group; verifies the branch monthly freeze and prepares the month’s other heads; freezes (prepares) the Quarter/Year close', daily: 'Approve', weekly: 'Verify', month: 'Verify¹ / Freeze²', quarter: 'Freeze', year: 'Freeze' },
  { role: 'FM', who: 'Sr. Finance Manager', duty: 'Approves weekly; verifies the Month/Quarter/Year close; the sole editor in an Owner-opened correction window', daily: '—', weekly: 'Approve', month: 'Verify', quarter: 'Verify', year: 'Verify' },
  { role: 'Director', who: 'Director', duty: 'Certifies the Month/Quarter/Year close', daily: '—', weekly: '—', month: 'Certify', quarter: 'Certify', year: 'Certify' },
  { role: 'Owner', who: 'Owner · Super Admin', duty: 'Locks the close (final); the ONLY role that can re-open a locked period', daily: '—', weekly: '—', month: 'Lock', quarter: 'Lock', year: 'Lock' },
];
// Footnotes for the month column: ¹ bank/client/supplier (frozen at the branch);
// ² the month's other heads (tax/loans/capital/assets, prepared at TK Group).
export const ROLE_MATRIX_MONTH_NOTES = '¹ bank / client / supplier — frozen at the branch, then verified at TK Group.  ² the month’s other heads (tax, loans, capital, assets) — prepared at TK Group Central.';
