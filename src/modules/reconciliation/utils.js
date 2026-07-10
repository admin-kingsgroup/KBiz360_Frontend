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

// The four tiers — kept in ladder order. `chain` mirrors the backend service
// (the server is authoritative; this copy only drives labels and the Rule Book).
export const TIERS = [
  {
    key: 'weekly', short: 'Weekly', label: 'Weekly — Reconcile & Release', mode: 'digital',
    cadence: 'Every BSP cycle (~weekly)', tone: 'success',
    scope: 'Cycle ledgers — bank · cash · BSP · online B2B suppliers',
    lock: 'Soft — releases the payment run & collection asks',
    chain: [
      { role: 'Branch Accountant', action: 'Prepared' },
      { role: 'AE', action: 'Verified' },
      { role: 'FM', action: 'Verified' },
      { role: 'Director', action: 'Signed & Released' },
    ],
  },
  {
    key: 'month', short: 'Month-End', label: 'Month-End — Close & Lock', mode: 'physical',
    cadence: 'Monthly', tone: 'info',
    scope: 'All Balance-Sheet ledgers — client, supplier, tax, loans, capital, assets',
    lock: 'Hard — fires the period lock when every ledger is locked',
    chain: [
      { role: 'AE', action: 'Verified' },
      { role: 'FM', action: 'Approved' },
      { role: 'Director', action: 'Certified' },
      { role: 'Owner', action: 'Locked' },
    ],
  },
  {
    key: 'quarter', short: 'Quarterly', label: 'Quarterly — Statutory Close', mode: 'physical',
    cadence: 'Quarterly — India fiscal (Apr–Mar) · Africa calendar (Jan–Dec)', tone: 'gold',
    scope: '+ statutory filings · inter-branch elimination · provisions · facilities',
    lock: 'Hard — quarter lock',
    chain: [
      { role: 'AE', action: 'Verified' },
      { role: 'FM', action: 'Approved' },
      { role: 'Director', action: 'Reviewed' },
      { role: 'Owner', action: 'Certified' },
      { role: 'Statutory', action: 'Verified' },
    ],
  },
  {
    key: 'year', short: 'Year-End', label: 'Year-End — Finalize & Adopt', mode: 'physical',
    cadence: 'Annually — India FY (Apr–Mar) · Africa calendar year (Jan–Dec)', tone: 'warning',
    scope: '+ closing entries · carry-forward · annual statutory · external confirmations · audit',
    lock: 'Permanent — reopening needs a formal restatement',
    chain: [
      { role: 'AE', action: 'Verified' },
      { role: 'FM', action: 'Prepared' },
      { role: 'Director', action: 'Reviewed' },
      { role: 'Owner', action: 'Certified' },
      { role: 'Auditor', action: 'Attested' },
      { role: 'Owner', action: 'Adopted' },
    ],
  },
];
export const tierOf = (key) => TIERS.find((t) => t.key === key) || TIERS[0];

/** Tiers a role may see/work. The Branch Accountant handles the WEEKLY cycle
 *  only — Month/Quarter/Year closings are done from TK Group Central by
 *  AE/FM/Director/Owner (the backend enforces the same rule on writes). */
export function visibleTiers(role) {
  return /accountant/i.test(String(role || '')) ? TIERS.filter((t) => t.key === 'weekly') : TIERS;
}

/** The weekly cycle CONFIG (wallets/gateways joining the cycle) is a control:
 *  FM / Director / Owner maintain it — AE verifies certificates, never
 *  reshapes the scope. Mirrors the backend gate exactly. */
export function canEditCycleConfig(role) {
  return /finance\s*manager|(^|[^a-z])fm([^a-z]|$)|director|owner|super[\s_-]*admin/i.test(String(role || ''));
}

// Certificate status → Badge tone + label.
export const STATUS_META = {
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

/** Signature progress on one certificate: "2 / 4 · next: FM". */
export function chainProgress(cert) {
  const chain = tierOf(cert?.tier).chain;
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
  { n: '04', title: 'Reconcile before cash moves', text: 'Weekly, no supplier payment or client collection releases until the Director’s digital signature is on — reconciled first, pay second.' },
  { n: '05', title: 'Physical = scan back', text: 'Month/Quarter/Year are wet-signed on paper, then the signed scan is uploaded — that upload is what fires the period lock.' },
  { n: '06', title: 'Branch-wise, never mixed', text: 'Every reconciliation is per branch. TK Group views roll up branch-wise; balances are never merged across branches.' },
  { n: '07', title: 'Delegation, not bottleneck', text: 'If the Director is unavailable, the Owner signs in his place (within approval limits) so cash is never stuck.' },
  { n: '08', title: 'Locked stays locked', text: 'A locked period is reopened only by a formal restatement with its own approval — never by an ordinary edit. Records retained 8 years.' },
];

// Who-does-what rows for the Rule Book roles table.
export const ROLE_MATRIX = [
  { role: 'Branch Accountant', who: 'At each branch', duty: 'Reconciles every ledger, uploads statements, prepares the certificate', weekly: 'Prepare', month: '—', quarter: '—', year: '—' },
  { role: 'AE', who: 'Accounts Executive', duty: 'Verifies the reconciliation & attached statements', weekly: 'Verify', month: 'Verify', quarter: 'Verify', year: 'Verify' },
  { role: 'FM', who: 'Sr. Finance Manager', duty: 'Reviews & approves; owns the close', weekly: 'Verify', month: 'Approve', quarter: 'Approve', year: 'Prepare' },
  { role: 'Director', who: 'Director', duty: 'Certifies; the weekly digital sign is the payment/collection release', weekly: 'Sign · release', month: 'Certify', quarter: 'Review', year: 'Review' },
  { role: 'Owner', who: 'Owner · Super Admin', duty: 'Certifies & locks; adopts year-end; full visibility; weekly fallback signer', weekly: 'Fallback', month: 'Lock', quarter: 'Certify', year: 'Certify · Adopt' },
  { role: 'Statutory', who: 'CA / Tax (external)', duty: 'Verifies statutory filing positions', weekly: '—', month: '—', quarter: 'Verify', year: 'Verify' },
  { role: 'Auditor', who: 'External auditor', duty: 'Attests the audited financial statements', weekly: '—', month: '—', quarter: '—', year: 'Attest' },
];
