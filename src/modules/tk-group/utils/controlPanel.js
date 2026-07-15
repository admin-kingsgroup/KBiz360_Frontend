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

  // Per-role control state across all FIVE roles. With no master switch, a role is "under
  // control" (walks the approval chain) ONLY when its own control.role.* switch is on;
  // otherwise it is INDEPENDENT — no approval required, acts on its own.
  const people = ROLE_SWITCHES.map((rs) => {
    const under = flagOnGlobal(cfg.flags, rs.flag);
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
  // Branch-accountant routing is covered by the Role control check above
  // (control.role.branch_accountant); the old approval.chain_branch_entries flag is retired.
  return { routed: reasons.length > 0, reasons };
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

/** Daily Digest — one Owner/Director summary from the monitor payloads (getOverview +
 *  getIntegrity + getInbox). Defensive of every shape; pure & testable. */
export function digestSummary({ overview = {}, integrity = {}, inbox = {} } = {}) {
  const num = (v) => Number(v) || 0;
  const sp = overview.streamPending || {};
  const branches = Array.isArray(integrity.branches) ? integrity.branches : [];
  const fails = integrity.fails != null ? num(integrity.fails) : branches.reduce((n, b) => n + num(b.fails), 0);
  const notReady = branches.filter((b) => b && b.closeReady === false).map((b) => b.branch || b.code).filter(Boolean);
  return {
    pending: num(overview.pendingTotal),
    oldestDays: num(overview.oldestPendingDays),
    lockedPeriods: num(overview.lockedPeriods),
    governance: num(sp.governance),
    decision: num(sp.decision),
    mine: num(inbox.count),                        // items waiting on the current user
    exceptions: fails,                             // failing integrity gates (drift, suspense, self-approvals, …)
    notCloseReady: notReady,
    closeReady: branches.length > 0 && notReady.length === 0,
  };
}

// ─── Power Console structure (pure data) ─────────────────────────────────────
// Two RULE screens — Default Rules (always-on, read-only) and Configurable Rules (the
// Owner's ON/OFF switches) — plus the enforcement tools and reference/oversight screens.
// There is NO master switch: enforcement engages rule-by-rule. `key` matches the
// component's screen router.
export const POWER_SCREENS = [
  { group: 'Rules', items: [
    { key: 'defaults',     label: 'Default Rules' },
    { key: 'configurable', label: 'Configurable Rules' },
  ] },
  { group: 'Enforcement tools', items: [
    { key: 'matrix',   label: 'Enforcement Matrix' },
    { key: 'limits',   label: 'Limits & Thresholds' },
    { key: 'tester',   label: 'Policy Tester' },
  ] },
  { group: 'Reference & oversight', items: [
    { key: 'roles',      label: 'Role Capabilities' },
    { key: 'users',      label: 'User Configuration' },
    { key: 'masters',    label: 'Master & Onboarding' },
    { key: 'delegation', label: 'Delegation' },
    { key: 'breakglass', label: 'Break-Glass Access' },
    { key: 'active',     label: 'Active Controls' },
    { key: 'digest',     label: 'Daily Digest' },
    { key: 'log',        label: 'Change Log / Audit' },
  ] },
];

/** Flat list of all screen keys (for the router / tests). */
export const POWER_SCREEN_KEYS = POWER_SCREENS.flatMap((g) => g.items.map((i) => i.key));

// ── Screen 1 · DEFAULT RULES — always enforced, not switchable (read-only) ────
// The foundation locks that apply on day one, guard or no guard. maker≠approver and
// payment-prepared≠released are the two SoD rules promoted to always-on when the master
// switch was removed (they only bite on an under-control / money-out voucher).
export const DEFAULT_RULES = [
  { nm: 'Require approval before posting', ds: 'Every voucher starts Pending — nothing hits the books until it is approved.' },
  { nm: 'Maker cannot approve their own routed voucher', ds: 'Once a voucher is under control (routed / reviewChain), its maker can never give the approval — a different person must. An un-routed voucher can still be self-cleared during the migration.' },
  { nm: 'Payment prepared ≠ Payment released', ds: 'Money-out starts Pending and the maker is barred from releasing it, so a different person must.' },
  { nm: 'Master create ≠ Master approve', ds: 'Faiz creates heads, the Owner approves — never the same hand (locked meta-rule).' },
  { nm: 'Numbering lock (auto only)', ds: 'Voucher numbers are always system-generated — no manual resets.' },
  { nm: 'Wired-ledger lock', ds: 'Module / tax / inter-branch heads are locked for everyone.' },
  { nm: 'Master & onboarding chains are the Owner’s', ds: 'Chart-of-accounts and new-party onboarding follow a maker → Owner chain — ledger heads: Faiz → Owner; a new party: Branch → Faiz (KYC) → Director → Owner. The Owner-approval staging of a branch master write engages with the Master-creation lock (applies inline until it is on).' },
  { nm: 'Block future-dated entries', ds: 'No posting beyond today (two-layer guard; travel dates excepted).' },
  { nm: 'Duplicate-bill detection', ds: 'A supplier expense bill with the same supplier + Bill/Invoice no. as an existing entry is blocked on save (overridable with a reason).' },
  { nm: 'Negative-GP block', ds: 'A loss-making SO/PO/GP booking or INB deal (gross profit below 0) is hard-blocked on save for EVERY branch — no exemptions. Zero GP (at-cost) is allowed.' },
  { nm: 'Single active session per user', ds: 'A new Books login invalidates every earlier session, so other devices are signed out on their next request.' },
  { nm: 'Password strength', ds: 'Every new, changed or admin-reset password must be at least 8 characters and contain a letter and a number; a change signs the account out on every device.' },
  { nm: 'Approval-request alerts', ds: 'Pending work surfaces on the Alerts feed and the Inbox badge for the next approver.' },
  { nm: 'Stale-approval SLA + escalation', ds: 'Change-requests are aged against the clearance SLA — on-time / at-risk / breached — on the governance queue.' },
  { nm: 'Exception & risk alerts', ds: 'GP≤0 · negative cash · over-limit surface on the Alerts feed.' },
  { nm: 'Daily digest to Owner / Director', ds: 'An in-app Daily Digest summarises pending approvals, exceptions and close readiness at a glance.' },
  // ── Posting & entry integrity (always enforced in code, no flag) ──
  { nm: 'Voucher must be balanced (Dr = Cr)', ds: 'Every voucher’s total debit must equal its total credit or it can never post; the same ledger can’t sit on both the debit and credit side (a self-cancelling wash). Foundational.' },
  { nm: 'Approval validation gate', ds: 'Before a sale / purchase / booking posts it must pass: GST-rate sanity, total = net + GST + Service Charge-2 GST + TCS + round-off, a Flight/Holiday cost-centre tag (International/Domestic), valid multi-PO leg types, chosen customer & supplier ledgers, and positive totals.' },
  { nm: 'Inter-branch deals must use the INB Voucher', ds: 'A Travkings inter-branch sale can’t be entered as an SO/PO/GP booking — it is blocked and belongs in the INB pipeline.' },
  { nm: 'Post only to existing ledgers', ds: 'A direct GL voucher (payment · receipt · contra · journal · debit-note · expense) can’t silently create a ledger — a line carrying an amount but no ledger is refused; tax & control heads are seeded in the database only.' },
  // ── Lifecycle & audit ──
  { nm: 'Approved / posted voucher is immutable', ds: 'A voucher that has posted to the books can’t be edited — it must be revoked back to Pending first. Protects the audit trail.' },
  { nm: 'Deleted voucher is view-only', ds: 'A deleted voucher can never be edited, re-posted or re-approved, and its number stays retired.' },
  { nm: 'Every edit needs a reason and re-enters approval', ds: 'Editing a voucher requires an edit reason, forces it back to Pending, and clears the prior approval / review chain — changed figures must be re-checked.' },
  { nm: 'Full audit trail on every voucher action', ds: 'Approve, edit, revoke, delete, push and un-allocate are all recorded to the audit trail (best-effort — logging never blocks the action).' },
  // ── Revoke & refund integrity ──
  { nm: 'A refund’s original must resolve', ds: 'A refund / reissue that names an original sale/purchase must find it, otherwise it stays Pending — this prevents over-refunding a client.' },
  { nm: 'Revoke needs a reason and fully un-posts', ds: 'A revoke requires a reason and must completely reverse the journal, verified — never a half-revoke. It is hard-blocked when it would break a bank-reconciled or frozen-reconciliation record, a pushed INB deal, a master-locked booking/order leg, or an original that a live refund/reissue reverses. (A settled bill or an aged / closed-period revoke proceeds with a warning, not a block.)' },
  // ── Masters & access ──
  { nm: 'Ledger integrity', ds: 'Ledger codes are system-generated, ledger names are unique per scope, and a ledger that already has postings can’t be deleted (deactivate it instead).' },
  { nm: 'Branch isolation', ds: 'A branch-scoped user can only view or act on the branches they are assigned; another branch’s record simply returns “not found”.' },
  { nm: 'View-only users can’t write', ds: 'A view-only user is blocked from ERP data writes — they may still renew their own token, change their own password, and use support tickets. (Session sign-out on new login / password change is covered by Single active session and Password strength above.)' },
];

// ── Screen 2 · CONFIGURABLE RULES — the Owner's ON/OFF switches, by group ──────
// Every one ships OFF (dormant) and is its own independent switch — no master gate.
// `crit` = a money/critical switch (red accent). Kept as data so the component renders
// them generically and they are testable.
export const CONFIGURABLE_GROUPS = [
  { group: 'Approval & Verification', items: [
    { nm: 'Let Sughra also Approve (AE-approve)', ds: 'ON = the Accounts Executive (Sughra) may give final approval on a branch-accountant voucher, not just verify. OFF = Sughra verifies only; Faiz (FM) gives final approval.', flag: 'approval.ae_can_approve' },
    { nm: 'Owner co-sign on sensitive types', ds: 'ON = a refund / reissue additionally needs the Owner (Afshin) to sign before final approval — routed through the chain, no self-clear. OFF = they approve like any other voucher.', flag: 'approval.owner_cosign_sensitive', crit: true },
    { nm: 'Branch Accountant under control', ds: "ON = a Branch Accountant's entries walk Check → Verify → Approve. OFF = acts independently, no approval required.", flag: 'control.role.branch_accountant' },
    { nm: 'Accounts Executive (Sughra) under control', ds: "ON = Sughra's entries walk the approval chain. OFF = acts independently.", flag: 'control.role.ae' },
    { nm: 'Finance Manager (Faiz) under control', ds: "ON = Faiz's entries walk the approval chain — FM can no longer single-step approve their own. OFF = acts independently.", flag: 'control.role.fm' },
    { nm: 'Director (Farhan) under control', ds: "ON = Farhan's entries walk the approval chain. OFF = acts independently.", flag: 'control.role.director' },
    { nm: 'Owner (Afshin) under control', ds: "ON = Afshin's entries walk the approval chain. OFF = acts independently. Note: a Super Admin can still override the chain.", flag: 'control.role.owner' },
  ] },
  { group: 'Segregation of Duties', items: [
    { nm: 'Verifier ≠ Approver on the same voucher', ds: 'ON = Check → Verify → Approve pass through different hands on the same voucher (relaxable via AE-approve). OFF = not separately enforced.', flag: 'sod.verifier_ne_approver' },
    { nm: 'Large-voucher escalation sign-offs', ds: 'ON = over the escalate ceiling a voucher also needs a Director (Farhan) sign-off, and over the dual ceiling an Owner (Afshin) sign-off, before Faiz’s final approval posts. OFF = FM-approve alone is enough.', flag: 'approval.escalation_signoffs' },
  ] },
  { group: 'Access & Export', items: [
    { nm: 'Relocate central screens off branch', ds: 'ON = masters · approvals · money-out · period-close live in TK Group Central only (removed from the Branch surface). OFF = branches keep those screens inline.', flag: 'branch.central_relocated' },
    { nm: 'Hide branch statements (P&L / Balance Sheet)', ds: 'ON = P&L / GP / MIS hidden from Branch Accountants (central always sees). OFF = branches see their own statements.', flag: 'branch.hide_statements' },
    { nm: 'Restrict export of sensitive data', ds: 'ON = only permitted roles may export ledgers / registers / P&L (a view-only user is blocked at the shared export helper). OFF = export open to anyone with view access.', flag: 'reports.restrict_export' },
    { nm: 'Log every export', ds: 'ON = every export (allowed or blocked) is recorded to the central export trail — who exported what, when. OFF = exports are not logged.', flag: 'reports.log_exports' },
    { nm: 'Block branch export of group reports', ds: 'ON = a branch-scoped user cannot export a consolidated (group) report. OFF = branch users may export group reports.', flag: 'reports.block_branch_group_export' },
  ] },
  { group: 'Masters & Locks', items: [
    { nm: 'Master-creation lock', ds: 'ON = a branch ledger / party create · delete stages for Owner approval (masterGuard). OFF = branch master writes apply inline.', flag: 'masters.creation_lock' },
    { nm: 'Field locks (PAN · bank · credit-limit)', ds: 'ON = a branch PAN / bank / credit-limit change stages for Owner approval. OFF = applied inline.', flag: 'masters.field_locks' },
    { nm: 'Period lock', ds: 'ON = no posting or editing into a closed / filed period. Set specific periods on Period Locks. OFF = not enforced.', flag: 'masters.period_lock' },
    { nm: 'Tax filing lock', ds: 'ON = a filed period locks (no edits after filing). OFF = not enforced.', flag: 'masters.tax_filing_lock' },
  ] },
  { group: 'Data-Entry & Close', items: [
    { nm: 'Mandatory documents', ds: "ON = a money-out / expense / ADM-ACM voucher can't be created without a supporting attachment. OFF = attachment optional.", flag: 'entry.mandatory_docs' },
    { nm: 'Reconciliation before close', ds: "ON = a period can't hard-close until bank / client / supplier reconciliation is signed off (no open lines through period end). OFF = close not gated on recon.", flag: 'close.require_recon' },
    { nm: 'Integrity before close', ds: "ON = a period can't hard-close while any Control-Tower integrity gate is failing (journal drift, suspense, self-approvals, sub-ledger ↔ GL, …). OFF = close not gated on integrity.", flag: 'close.require_integrity' },
  ] },
];

/** Flat list of every configurable flag key — the set the bulk "Enable all / Disable all"
 *  acts on, and the FE mirror of the backend CONTROLLABLE_KEYS. */
export const CONFIGURABLE_FLAGS = CONFIGURABLE_GROUPS.flatMap((g) => g.items.map((i) => i.flag));

// Rules the Owner has decided AGAINST — shown as a muted footnote on the Configurable
// screen so the decision is visible without cluttering the switch list.
export const DECLINED_RULES = [
  { nm: 'Password rotation (force periodic reset)', ds: 'Scheduled password resets are not required.' },
  { nm: 'Require 2-factor authentication', ds: 'No second login factor.' },
  { nm: 'Login working-hours window', ds: 'Logins are not restricted by time of day (branches span four timezones).' },
  { nm: 'IP / location allow-list', ds: 'Logins are not restricted to office IPs.' },
];

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
