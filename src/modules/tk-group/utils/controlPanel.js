// ─── TK GROUP · FE · Control Panel view model (pure) ─────────────────────────
// Interprets the LIVE control config into the Control Panel's shape: the 3-level
// approval chain (Check -> Verify -> Approve) with the real configured people, whether
// the Accounts Executive can also approve (the toggle), and the master-guard state.
// Mirrors the backend shared/approvalChain resolution so the panel shows exactly what
// enforces. Pure & testable; the page pulls the raw config from app-config + flags.
import { resolveCell } from './voucherPolicy';
import { isFlagOn } from './flags';

const DEFAULT_VERIFY = ['sughra@travkings.com'];   // AE — mirrors shared/approvalChain
const DEFAULT_APPROVE = ['faiz@travkings.com'];    // FM

// The five roles that can be individually switched "under control" (walk the approval
// chain) vs left "independent" — Enforcement-Matrix-style, independent of the master
// guard. `flag` is the backing control.role.* flag (mirrors backend roles.ROLE_CONTROL_FLAG
// + the flag catalogue). Order is top-to-bottom of the chain.
export const ROLE_SWITCHES = [
  { key: 'branch_accountant', name: 'Branch Accountant', role: 'Branch Accountant', duty: 'Enters vouchers · Check (level 1)', flag: 'control.role.branch_accountant' },
  { key: 'ae', name: 'Sughra', role: 'Accounts Executive', duty: 'Verify (level 2)', flag: 'control.role.ae' },
  { key: 'fm', name: 'Faiz', role: 'Finance Manager', duty: 'Approve & post (level 3)', flag: 'control.role.fm' },
  { key: 'director', name: 'Farhan', role: 'Director', duty: 'Oversight · escalation sign-off', flag: 'control.role.director' },
  { key: 'owner', name: 'Afshin', role: 'Owner', duty: 'Final authority · sensitive co-sign', flag: 'control.role.owner' },
];

/** Is a flag ON in a raw flag-state payload ({ flags: { <key>: {enabled|foundation} } })? */
function flagOnGlobal(flags, key) {
  const f = ((flags && flags.flags) || {})[key];
  return !!f && (f.foundation === true || f.enabled === true);
}

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

  // Per-role control state across all FIVE roles. A role is "under control" (walks the
  // approval chain) when EITHER the master guard is on OR its own control.role.* switch is
  // on (the switches enforce independently of the master guard, like the Enforcement
  // Matrix). Otherwise the role is INDEPENDENT — no approval required, acts on its own.
  const people = ROLE_SWITCHES.map((rs) => {
    const under = mOn || flagOnGlobal(cfg.flags, rs.flag);
    return {
      key: rs.key, name: rs.name, role: rs.role, duty: rs.duty, flag: rs.flag,
      extra: rs.key === 'ae' && aeCanApprove ? 'can also Approve' : '',
      independent: !under,
      status: under ? 'Under control' : 'Independent — no approval required',
    };
  });

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

/** Emails present in BOTH the Verify and Approve lists — a segregation-of-duties conflict
 *  (the same person could verify AND give final approval on their own voucher). Pure. */
export function verifyApproveOverlap(view = {}) {
  const verify = new Set(view.verify || []);
  return (view.approve || []).filter((e) => verify.has(e));
}

/** Guardrail before routing a role through the chain: if that role's own person is the SOLE
 *  verifier / approver, their own entries can't be cleared by anyone but the Owner (maker ≠
 *  verifier ≠ approver). Returns a caution string for that role, or null. `view` =
 *  approvalChainView(). Only 'fm' (sole approver) and 'ae' (sole verifier) can hit it. */
export function roleControlWarning(roleKey, view = {}) {
  if (roleKey === 'fm' && !view.aeCanApprove && (view.approve || []).length <= 1) {
    return 'Faiz is the only approver — under control he can’t approve his own entries, so only the Owner could. Add a second approver or enable “Let Sughra also Approve”.';
  }
  if (roleKey === 'ae' && (view.verify || []).length <= 1) {
    return 'Sughra is the only verifier — under control her own entries can’t be verified (only the Owner could clear them). Add a second verifier.';
  }
  return null;
}

/** Policy Tester — given the live config + a hypothetical voucher, does it POST DIRECTLY or
 *  ROUTE to Check → Verify → Approve, and WHY. Mirrors the BE create() guard (Enforcement
 *  Matrix + per-role switches + owner-cosign + branch-entry chain). `store` = voucher-policy
 *  store; `flags` = flag-state payload; `rowKey` = a Matrix row (booking/inb/receipt/…);
 *  `role` = a ROLE_SWITCHES key. Returns { routed, reasons:[{rule,detail}], masterOn }. Pure. */
export function policyTest({ store, flags, branch, rowKey, amount, role } = {}) {
  const reasons = [];
  const amt = Math.abs(Number(amount) || 0);
  const cell = resolveCell(store, branch, rowKey);
  if (cell.enforce && amt >= (Number(cell.threshold) || 0)) {
    reasons.push({ rule: 'Enforcement Matrix', detail: `“${rowKey}” is enforced ${cell.threshold ? `at/above ${cell.threshold}` : 'at any amount'}${cell.effectiveDate ? ` from ${cell.effectiveDate}` : ''}.` });
  }
  const rs = ROLE_SWITCHES.find((r) => r.key === role);
  if (rs && isFlagOn(flags, rs.flag, branch)) {
    reasons.push({ rule: 'Role control', detail: `${rs.name} (${rs.role}) is switched under control.` });
  }
  if ((rowKey === 'refund' || rowKey === 'reissue') && isFlagOn(flags, 'approval.owner_cosign_sensitive', branch)) {
    reasons.push({ rule: 'Owner co-sign', detail: 'a refund / reissue additionally needs the Owner to sign.' });
  }
  if (role === 'branch_accountant' && isFlagOn(flags, 'approval.chain_branch_entries', branch)) {
    reasons.push({ rule: 'Branch-entry chain', detail: 'branch-accountant entries walk Check → Verify → Approve.' });
  }
  return { routed: reasons.length > 0, reasons, masterOn: isFlagOn(flags, 'core.policy_guard', branch) };
}

/** Active Controls digest — every flag currently ON (globally, or overridden ON for some
 *  branch). `flags` = flag-state payload ({ flags: { key: {enabled,foundation,branches,…} } }).
 *  Returns [{ key, label, scope, globalOn, branchesOn:[codes] }] sorted by key. Pure. */
export function activeControls(flags, branchCodes = []) {
  const map = (flags && flags.flags) || {};
  const out = [];
  Object.keys(map).forEach((key) => {
    const f = map[key] || {};
    const globalOn = f.foundation === true || f.enabled === true;
    const branchesOn = branchCodes.filter((b) => {
      const has = f.branches && Object.prototype.hasOwnProperty.call(f.branches, b);
      return has ? f.branches[b] === true : globalOn;
    });
    const anyOverrideOn = f.branches && Object.values(f.branches).some((v) => v === true);
    if (globalOn || anyOverrideOn) out.push({ key, label: f.label || key, scope: f.scope || 'global', globalOn, branchesOn });
  });
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

// ─── Power Console structure (pure data) ─────────────────────────────────────
// The screens, grouped. `key` matches the component's screen router; every screen ships
// dormant. Order is the recommended engage-order within each group.
export const POWER_SCREENS = [
  { group: 'Enforcement', items: [
    { key: 'master',   label: 'Master Switch' },
    { key: 'approval', label: 'Approval & Verification' },
    { key: 'matrix',   label: 'Enforcement Matrix' },
    { key: 'limits',   label: 'Limits & Thresholds' },
    { key: 'tester',   label: 'Policy Tester' },
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
    { key: 'active',        label: 'Active Controls' },
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
    { nm: 'Relocate central screens off branch', ds: 'ON = masters · approvals · money-out · period-close live in TK Group Central only (removed from the Branch surface). OFF = branches keep those screens inline.', flag: 'branch.central_relocated' },
    { nm: 'Hide branch statements (P&L / Balance Sheet)', ds: 'ON = P&L / GP / MIS hidden from Branch Accountants (central always sees). OFF = branches see their own statements.', flag: 'branch.hide_statements' },
    { nm: 'Master-creation lock', ds: 'Not a switch — engages automatically with the master guard: once ON, a branch ledger / party write stages for Owner approval (masterGuard).', guarded: true },
    { nm: 'Field locks (PAN · bank · credit-limit)', ds: 'Not a switch — engages with the master guard: a branch PAN / bank / credit-limit change stages for Owner approval.', guarded: true },
    { nm: 'Period lock', ds: 'Not a switch — engages with the master guard: no posting into a closed / filed period. Set specific periods on Period Locks.', guarded: true },
    { nm: 'Numbering lock (auto only)', ds: 'Already active: voucher numbers are always system-generated — no manual resets. Nothing to switch.', applied: true },
    { nm: 'Wired-ledger lock', ds: 'Already active: module / tax / inter-branch heads are locked for everyone. Nothing to switch.', applied: true },
  ],
  sod: [
    { nm: 'A maker cannot approve their own voucher', ds: 'Not a switch — engages with the master guard: the maker is barred from its own approval (isMaker check).', guarded: true },
    { nm: 'Verifier ≠ Approver on the same voucher', ds: 'Not a switch — engages with the master guard: Check → Verify → Approve pass through different hands (relaxable via AE-approve).', guarded: true },
    { nm: 'Master create ≠ Master approve', ds: 'Already active: Faiz creates, the Owner approves — never the same hand (locked meta-rule). Nothing to switch.', applied: true },
    { nm: 'Payment prepared ≠ Payment released', ds: 'Not a switch — engages with the master guard: money-out starts Pending and the maker is barred from releasing it, so a different person must.', guarded: true, crit: true },
    { nm: 'Branch entries walk Check → Verify → Approve', ds: 'ON = a branch-accountant ERP voucher goes Check (entry) → Verify (Sughra) → Approve (Faiz), not the maker single-step approving their own. OFF = maker single-step approve (today). NOTE: the newer Branch Accountant switch on Approval & Verification does the same thing per-role — use one or the other, not both.', flag: 'approval.chain_branch_entries' },
    { nm: 'Large-voucher escalation sign-offs', ds: 'ON = over the escalate ceiling a voucher also needs a Director (Farhan) sign-off, and over the dual ceiling an Owner (Afshin) sign-off, before Faiz’s final approval posts. OFF = FM-approve alone is enough.', flag: 'approval.escalation_signoffs' },
  ],
  security: [
    { nm: 'Single active session per user', ds: 'Already active: a new Books login invalidates every earlier session, so other devices are signed out on their next request. Nothing to switch.', applied: true },
    { nm: 'Password strength (minimum length)', ds: 'Already active: a minimum length is enforced on every new / changed password, and a change signs the account out on every device. Nothing to switch.', applied: true },
    { nm: 'Password rotation (force periodic reset)', ds: 'Not adopted (Owner’s decision): scheduled password resets are not required.', declined: true },
    { nm: 'Require 2-factor authentication', ds: 'Not adopted (Owner’s decision): no second login factor.', declined: true },
    { nm: 'Login working-hours window', ds: 'Not adopted (Owner’s decision): logins are not restricted by time of day (branches span four timezones).', declined: true },
    { nm: 'IP / location allow-list', ds: 'Not adopted (Owner’s decision): logins are not restricted to office IPs.', declined: true },
  ],
  entry: [
    { nm: 'Block future-dated entries', ds: 'Already active: no posting beyond today (two-layer guard; travel dates excepted). Nothing to switch.', applied: true },
    { nm: 'Duplicate detection', ds: 'Not built yet (roadmap): would warn / block a repeat of the same invoice / voucher.', planned: true },
    { nm: 'GP-floor block', ds: 'Not built yet (roadmap): a booking under the GP floor would need central approval.', planned: true },
    { nm: 'Mandatory documents', ds: "ON = a money-out / expense / ADM-ACM voucher can't be created without a supporting attachment. OFF = attachment optional.", flag: 'entry.mandatory_docs' },
    { nm: 'Tax filing lock', ds: 'Not a switch — engages with the master guard: a filed period locks (no edits after filing, via period lock).', guarded: true },
    { nm: 'Reconciliation before close', ds: "ON = a period can't hard-close until bank / client / supplier reconciliation is signed off (no open lines through period end). OFF = close not gated on recon.", flag: 'close.require_recon' },
    { nm: 'Integrity before close', ds: "ON = a period can't hard-close while any Control-Tower integrity gate is failing (journal drift, suspense, self-approvals, sub-ledger ↔ GL, …). OFF = close not gated on integrity.", flag: 'close.require_integrity' },
  ],
  notifications: [
    { nm: 'Approval-request alerts', ds: 'Already active: pending work surfaces on the Alerts feed and the Inbox badge for the next approver. Nothing to switch.', applied: true },
    { nm: 'Stale-approval SLA + escalation', ds: 'Already active: change-requests are aged against the clearance SLA — on-time / at-risk / breached — on the governance queue.', applied: true },
    { nm: 'Exception & risk alerts', ds: 'Already active: GP≤0 · negative cash · over-limit surface on the Alerts feed. Nothing to switch.', applied: true },
    { nm: 'Daily digest to Owner / Director', ds: 'Not built yet (roadmap): one scheduled email summary of pending, exceptions and close status.', planned: true },
  ],
  reports: [
    { nm: 'Restrict export of sensitive data', ds: 'ON = only permitted roles may export ledgers / registers / P&L (a view-only user is blocked at the shared export helper). OFF = export open to anyone with view access.', flag: 'reports.restrict_export' },
    { nm: 'Log every export', ds: 'ON = every export (allowed or blocked) is recorded to the central export trail — who exported what, when. OFF = exports are not logged.', flag: 'reports.log_exports' },
    { nm: 'Block branch export of group reports', ds: 'ON = a branch-scoped user cannot export a consolidated (group) report. OFF = branch users may export group reports.', flag: 'reports.block_branch_group_export' },
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
