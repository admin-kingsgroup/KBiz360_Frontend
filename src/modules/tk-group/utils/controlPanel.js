// ─── TK GROUP · FE · Control Panel view model (pure) ─────────────────────────
// Interprets the LIVE control config into the Control Panel's shape: the 3-level
// approval chain (Check -> Verify -> Approve) with the real configured people, whether
// the Accounts Executive can also approve (the toggle), and the master-guard state.
// Mirrors the backend shared/approvalChain resolution so the panel shows exactly what
// enforces. Pure & testable; the page pulls the raw config from app-config + flags.

const DEFAULT_VERIFY = ['sughra@travkings.com'];   // AE — mirrors shared/approvalChain
const DEFAULT_APPROVE = ['faiz@travkings.com'];    // FM

/** Normalise an app-config value (array | comma/space string | null) to a clean,
 *  lower-cased email list, falling back to the built-in default when empty. Mirrors
 *  approvalChain.asEmailList so the panel matches what the server actually enforces. */
export function asEmailList(v, fallback = []) {
  const arr = Array.isArray(v) ? v : (typeof v === 'string' && v.trim() ? v.split(/[,;\s]+/) : null);
  const clean = (arr || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean);
  return clean.length ? clean : fallback;
}

function masterOn(flags) {
  const f = ((flags && flags.flags) || {})['core.policy_guard'] || {};
  return f.foundation === true || f.enabled === true;
}

/** Build the Control Panel view model from the raw config.
 *  @param {{verifyEmails?:any, approveEmails?:any, flags?:object}} cfg
 *  @returns {{levels:Array, verify:string[], approve:string[], aeCanApprove:boolean, masterOn:boolean}} */
export function approvalChainView(cfg = {}) {
  const verify = asEmailList(cfg.verifyEmails, DEFAULT_VERIFY);
  const approve = asEmailList(cfg.approveEmails, DEFAULT_APPROVE);
  // AE-can-approve is on when either the control flag is engaged OR a verifier (Sughra)
  // is already in the approver set — so she can give final approval, not just verify.
  const flagsMap = (cfg.flags && cfg.flags.flags) || {};
  const aeFlag = flagsMap['approval.ae_can_approve'];
  const aeFlagOn = !!aeFlag && (aeFlag.foundation === true || aeFlag.enabled === true);
  const aeCanApprove = aeFlagOn || verify.some((e) => approve.includes(e));
  const mOn = masterOn(cfg.flags);

  // Per-person control state. When NO control applies to a person (all toggles off —
  // today that means the master guard is dormant), they act INDEPENDENTLY: no approval
  // required, they react on their own. When the guard is engaged they operate within
  // the chain. This is what the Control Panel shows against each name.
  const people = [
    { key: 'sughra', name: 'Sughra', role: 'Accounts Executive', duty: 'Verify (level 2)', extra: aeCanApprove ? 'can also Approve' : '' },
    { key: 'faiz',   name: 'Faiz',   role: 'Finance Manager',    duty: 'Approve & post (level 3)', extra: '' },
  ].map((p) => ({
    ...p,
    independent: !mOn,
    status: mOn ? 'Under control' : 'Independent — no approval required',
  }));

  return {
    levels: [
      { n: 1, name: 'Check', role: 'Branch accountant', who: 'the entry branch' },
      { n: 2, name: 'Verify', role: 'Accounts Executive', who: verify.join(', ') },
      { n: 3, name: 'Approve', role: 'Finance Manager', who: approve.join(', ') },
    ],
    verify,
    approve,
    aeCanApprove,
    masterOn: mOn,
    people,
  };
}

export { DEFAULT_VERIFY, DEFAULT_APPROVE };

// ─── Power Console structure (pure data) ─────────────────────────────────────
// The 17 screens, grouped. `key` matches the component's screen router; every screen
// ships dormant. Order is the recommended engage-order within each group.
export const POWER_SCREENS = [
  { group: 'Enforcement', items: [
    { key: 'master',   label: 'Master Switch' },
    { key: 'approval', label: 'Approval & Verification' },
    { key: 'matrix',   label: 'Enforcement Matrix' },
    { key: 'limits',   label: 'Limits & Thresholds' },
  ] },
  { group: 'Access & Rights', items: [
    { key: 'rights',   label: 'Rights & Locks' },
    { key: 'roles',    label: 'Role Capabilities' },
    { key: 'users',    label: 'User Configuration' },
    { key: 'sod',      label: 'Segregation of Duties' },
    { key: 'security', label: 'Access & Security' },
    { key: 'reports',  label: 'Report & Export Controls' },
  ] },
  { group: 'Governance', items: [
    { key: 'masters',    label: 'Master & Onboarding' },
    { key: 'delegation', label: 'Delegation' },
    { key: 'entry',      label: 'Data-Entry & Compliance' },
    { key: 'breakglass', label: 'Break-Glass Access' },
  ] },
  { group: 'Oversight', items: [
    { key: 'notifications', label: 'Notifications & SLA' },
    { key: 'erp',           label: 'ERP Config & Security' },
    { key: 'log',           label: 'Change Log / Audit' },
  ] },
];

/** Flat list of all screen keys (for the router / tests). */
export const POWER_SCREEN_KEYS = POWER_SCREENS.flatMap((g) => g.items.map((i) => i.key));

// Data-driven control lists — each screen that is just a stack of switches. Every one
// ships OFF (dormant). `crit` = a money/critical switch (red accent). Kept as data so
// the component renders them generically and they are testable.
export const CONTROL_LISTS = {
  rights: [
    { nm: 'Relocate central screens off branch', ds: 'Masters · approvals · money-out move to TK Group only.', flag: 'branch.central_relocated' },
    { nm: 'Hide branch statements (P&L / Balance Sheet)', ds: 'ON = P&L / GP / MIS hidden from Branch Accountants; central always sees.', flag: 'branch.hide_statements' },
    { nm: 'Master-creation lock', ds: "Branch ledger / party writes route to Owner approval (masterGuard).", guarded: true },
    { nm: 'Field locks (PAN · bank · credit-limit)', ds: 'Party-field changes from a branch stage for Owner approval.', guarded: true },
    { nm: 'Period lock', ds: 'No posting into a closed / filed period. Set specific periods on Period Locks.', guarded: true },
    { nm: 'Numbering lock (auto only)', ds: 'Voucher numbers are always system-generated — no manual resets.', applied: true },
    { nm: 'Wired-ledger lock', ds: 'Module / tax / inter-branch heads locked for everyone.', applied: true },
  ],
  sod: [
    { nm: 'A maker cannot approve their own voucher', ds: 'Barred from its approval — enforced by the guard (isMaker check).', guarded: true },
    { nm: 'Verifier ≠ Approver on the same voucher', ds: 'Check → Verify → Approve pass through different hands (relaxable via AE-approve).', guarded: true },
    { nm: 'Master create ≠ Master approve', ds: 'Faiz creates; the Owner approves — never the same hand (locked meta-rule).', applied: true },
    { nm: 'Payment prepared ≠ Payment released', ds: 'Money-out starts Pending and the maker is barred from approving it (SoD) — so a different person must release it.', guarded: true, crit: true },
    { nm: 'Branch entries walk Check → Verify → Approve', ds: 'A branch-accountant ERP voucher goes Check (entry) → Verify (Sughra) → Approve (Faiz) — not the maker single-step approving their own. Central-role entries use SoD. Dormant until engaged.', flag: 'approval.chain_branch_entries' },
    { nm: 'Large-voucher escalation sign-offs', ds: 'Over the escalate ceiling a voucher also needs a Director (Farhan) sign-off; over the dual ceiling, an Owner (Afshin) sign-off too — before Faiz’s final approval posts. FM-approve alone is enough while off.', flag: 'approval.escalation_signoffs' },
  ],
  security: [
    { nm: 'Single active session per user', ds: 'Already enforced — a new Books login invalidates every earlier session (per-app login floor), so other devices are signed out on their next request.', applied: true },
    { nm: 'Password strength (minimum length)', ds: 'A minimum length is enforced on every new / changed password, and a password change signs the account out on every device (both apps).', applied: true },
    { nm: 'Password rotation (force periodic reset)', ds: 'Not adopted — the Owner does not require scheduled password resets.', declined: true },
    { nm: 'Require 2-factor authentication', ds: 'Not required — the Owner has decided against a second login factor.', declined: true },
    { nm: 'Login working-hours window', ds: 'Not adopted — logins are not restricted by time of day (branches span four timezones).', declined: true },
    { nm: 'IP / location allow-list', ds: 'Not adopted — logins are not restricted to office IPs.', declined: true },
  ],
  entry: [
    { nm: 'Block future-dated entries', ds: 'No posting beyond today — already a two-layer guard (travel dates excepted).', applied: true },
    { nm: 'Duplicate detection', ds: 'Warn / block a repeat of the same invoice / voucher.', planned: true },
    { nm: 'GP-floor block', ds: 'A booking under the GP floor needs central approval.', planned: true },
    { nm: 'Mandatory documents', ds: "A money-out / expense / ADM-ACM voucher can't be created without a supporting attachment.", flag: 'entry.mandatory_docs' },
    { nm: 'Tax filing lock', ds: 'A filed period locks — no edits after filing (via period lock).', guarded: true },
    { nm: 'Reconciliation before close', ds: "A period can't hard-close until bank / client / supplier reconciliation is signed off (no open lines through the period end).", flag: 'close.require_recon' },
    { nm: 'Integrity before close', ds: "A period can't hard-close while any Control-Tower integrity gate is failing (journal drift, suspense, self-approvals, sub-ledger ↔ GL, …). Clear them on the Control Tower first.", flag: 'close.require_integrity' },
  ],
  notifications: [
    { nm: 'Approval-request alerts', ds: 'Pending work already surfaces on the Alerts feed and the Inbox badge for the next approver.', applied: true },
    { nm: 'Stale-approval SLA + escalation', ds: 'Change-requests are aged against the clearance SLA — on-time / at-risk / breached — on the governance queue.', applied: true },
    { nm: 'Exception & risk alerts', ds: 'GP≤0 · negative cash · over-limit — already surface on the Alerts feed.', applied: true },
    { nm: 'Daily digest to Owner / Director', ds: 'One scheduled email summary of pending, exceptions and close status.', planned: true },
  ],
  reports: [
    { nm: 'Restrict export of sensitive data', ds: 'Only permitted roles may export ledgers / registers / P&L — a view-only user is blocked at the shared export helper.', flag: 'reports.restrict_export' },
    { nm: 'Log every export', ds: 'Who exported what, when — every export (allowed or blocked) is recorded to the central export trail.', flag: 'reports.log_exports' },
    { nm: 'Block branch export of group reports', ds: 'A branch-scoped user cannot export a consolidated (group) report.', flag: 'reports.block_branch_group_export' },
  ],
};

// Role capability posture (● full · ◐ conditional · ○ none), across the same columns
// as the Role Capabilities screen. Pure data for the matrix.
export const CAP_COLS = ['Enter', 'Verify', 'Approve', 'Post', 'Revoke', 'Masters', 'Config', 'Cross-branch'];
export const ROLE_CAPS = [
  { role: 'Branch Accountant', caps: ['full', 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },
  { role: 'Sughra · AE',       caps: ['cond', 'full', 'cond', 'none', 'none', 'none', 'none', 'full'] },
  { role: 'Faiz · FM',         caps: ['cond', 'full', 'full', 'full', 'full', 'full', 'cond', 'full'] },
  { role: 'Farhan · Director', caps: ['none', 'cond', 'none', 'none', 'none', 'none', 'cond', 'full'] },
  { role: 'Afshin · Owner',    caps: ['full', 'full', 'full', 'full', 'full', 'full', 'full', 'full'] },
];
