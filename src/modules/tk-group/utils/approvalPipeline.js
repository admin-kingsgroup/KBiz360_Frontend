// ─── TK GROUP · FE · cross-branch approval aggregation (pure) ────────────────
// The "one central queue across all branches" summary behind the Approvals view.
// Feeds the Owner/Faiz headline: how many vouchers are Pending, per branch, and the
// backlog by branch — from the SAME per-branch `counts` the branch approval screen
// already returns (useVoucherApprovals → { counts: { pending:{n,amount}, ... } }).
//
// Branchwise rule (never blend): approval COUNTS are currency-neutral → safe to sum;
// AMOUNTS are per branch currency → summed only WITHIN a currency, never into one
// group total. Pure & testable; the central Approvals page consumes it (and filters
// to a single branch under Focus).
//
// NOTE: the per-stage pipeline (Sughra verify → Faiz approve → Owner co-sign, "pending
// under whom") needs a verify sub-state on the voucher flow that does not exist yet —
// that is a deliberate backend change to the live approval path, tracked separately so
// it isn't rushed during the go-live migration. This util is the branch-level summary
// that stands on today's data.

const ZERO = { n: 0, amount: 0 };

function pick(counts, key) {
  const c = counts && counts[key];
  return { n: (c && c.n) || 0, amount: (c && c.amount) || 0 };
}

/** Aggregate per-branch approval counts into a branchwise summary + totals.
 *  @param {Array<{code:string,cur?:string,counts?:object}>} perBranch
 *  @returns {{ byBranch: Array, totals: object, pendingByCurrency: object }} */
export function aggregateApprovals(perBranch = []) {
  const list = Array.isArray(perBranch) ? perBranch : [];
  const byBranch = list.map((b) => {
    const counts = (b && b.counts) || {};
    return {
      code: b && b.code,
      cur: (b && b.cur) || '₹',
      pending: pick(counts, 'pending'),
      approved: pick(counts, 'approved'),
      rejected: pick(counts, 'rejected'),
      deleted: pick(counts, 'deleted'),
    };
  });

  const sumN = (k) => byBranch.reduce((s, b) => s + b[k].n, 0);
  const totals = {
    pendingN: sumN('pending'),
    approvedN: sumN('approved'),
    rejectedN: sumN('rejected'),
    deletedN: sumN('deleted'),
  };

  // Amounts summed WITHIN each currency only — ₹ and $ are never added together.
  const pendingByCurrency = {};
  for (const b of byBranch) {
    if (b.pending.amount) pendingByCurrency[b.cur] = (pendingByCurrency[b.cur] || 0) + b.pending.amount;
  }

  return { byBranch, totals, pendingByCurrency };
}

// Labels for the real 3-level chain (shared/approvalChain): Check → Verify (Sughra)
// → Approve (Faiz). 'direct' = ERP/legacy entries that keep the single-step approve
// (reviewStage '' — the chain applies only to CRM-pushed entries).
export const STAGE_LABELS = {
  check: 'Awaiting Check · branch',
  verify: 'Awaiting Verify · Sughra',
  approve: 'Awaiting Approve · Faiz',
  direct: 'Direct approve · ERP/legacy',
};
export const STAGE_ORDER = ['check', 'verify', 'approve', 'direct'];

/** Count pending entries by their REAL review stage (entries[].reviewStage from the
 *  approval report). Blank/unknown → 'direct' (single-step approve). Pure — the funnel
 *  behind "pending under whom", using live stage data (no parallel projection). */
export function stageFunnel(entries = []) {
  const f = { check: 0, verify: 0, approve: 0, direct: 0, total: 0 };
  for (const e of (Array.isArray(entries) ? entries : [])) {
    f.total += 1;
    const s = e && e.reviewStage;
    if (s === 'check' || s === 'verify' || s === 'approve') f[s] += 1;
    else f.direct += 1;
  }
  return f;
}

/** Branches with pending approvals, worst backlog first — the "who needs clearing"
 *  list for the Owner/Faiz. */
export function branchesWithPending(agg) {
  const rows = (agg && agg.byBranch) || [];
  return rows.filter((b) => b.pending.n > 0).sort((a, b) => b.pending.n - a.pending.n);
}

// ─── 5-stage pipeline — where each pending entry is waiting NOW ────────────────
// Maps the real chain stage (reviewStage) + the amount-tier escalation onto the five
// people-stages: Branch → AE·Sughra → FM·Faiz → Director·Farhan → Owner·Afshin.
//   check  → Branch (the entry is with the branch accountant)
//   verify → AE · Sughra
//   approve / direct → FM · Faiz, UNLESS the amount escalates it:
//        amount > voucherDual      → Owner · Afshin (only he may sign)
//        amount > voucherEscalate  → Director · Farhan (a senior must clear)
export const PIPELINE_STAGES = [
  { key: 'branch', role: 'Branch', name: 'Accountants', wait: 'entered' },
  { key: 'ae', role: 'Verify · AE', name: 'Sughra', wait: 'to verify' },
  { key: 'fm', role: 'Approve · FM', name: 'Faiz', wait: 'to post', gate: true },
  { key: 'director', role: 'Director', name: 'Farhan', wait: 'escalated' },
  { key: 'owner', role: 'Owner', name: 'Afshin Dhanani', wait: 'sole sign-off' },
];

const ageDaysOf = (e, nowMs) => {
  const d = e && (e.date || e.createdAt || e.submittedAt);
  const t = d ? Date.parse(d) : NaN;
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((nowMs - t) / 86_400_000));
};

/** Fold pending entries into the five people-stages. Returns rows in pipeline order,
 *  each { key, role, name, wait, gate?, n, amount, oldest }. Pure & testable. */
export function stagePipeline(entries = [], limits = {}, nowMs = Date.now()) {
  const dual = Number(limits.voucherDual) > 0 ? Number(limits.voucherDual) : Infinity;
  const escalate = Number(limits.voucherEscalate) > 0 ? Number(limits.voucherEscalate) : Infinity;
  const acc = {};
  for (const s of PIPELINE_STAGES) acc[s.key] = { ...s, n: 0, amount: 0, oldest: 0 };
  for (const e of (Array.isArray(entries) ? entries : [])) {
    const amt = Math.abs(Number(e.total != null ? e.total : e.amount) || 0);
    const stage = e && e.reviewStage;
    let key;
    if (stage === 'check') key = 'branch';
    else if (stage === 'verify') key = 'ae';
    else key = amt > dual ? 'owner' : amt > escalate ? 'director' : 'fm'; // approve / direct
    const b = acc[key];
    b.n += 1; b.amount += amt; b.oldest = Math.max(b.oldest, ageDaysOf(e, nowMs));
  }
  return PIPELINE_STAGES.map((s) => acc[s.key]);
}

export { ZERO as _ZERO };
