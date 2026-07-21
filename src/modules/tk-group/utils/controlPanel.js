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

// The seven roles that can be individually switched "under control" (walk the approval
// chain) vs left "independent" — Enforcement-Matrix-style, independent of the master
// guard. `flag` is the backing control.role.* flag (mirrors backend roles.ROLE_CONTROL_FLAG
// + the flag catalogue). Order is top-to-bottom of the chain (BM / GM sit outside the
// chain levels — branch-side oversight roles with their own switches).
export const ROLE_SWITCHES = [
  { key: 'branch_accountant', name: 'Branch Accountant', role: 'Branch Accountant', duty: 'Enters vouchers · Check (level 1)', flag: 'control.role.branch_accountant' },
  { key: 'ae', name: 'Sughra', role: 'Accounts Executive', duty: 'Verify (level 2)', flag: 'control.role.ae' },
  { key: 'fm', name: 'Faiz', role: 'Senior Finance Manager', duty: 'Approve & post (level 3)', flag: 'control.role.fm' },
  { key: 'branch_manager', name: 'Branch Manager', role: 'Branch Manager', duty: 'Branch operations oversight', flag: 'control.role.branch_manager' },
  { key: 'general_manager', name: 'General Manager', role: 'General Manager', duty: 'General operations oversight', flag: 'control.role.general_manager' },
  { key: 'director', name: 'Farhan', role: 'Director', duty: 'Oversight · escalation sign-off', flag: 'control.role.director' },
  { key: 'owner', name: 'Afshin', role: 'Owner', duty: 'Final authority', flag: 'control.role.owner' },
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
 *  @returns {{levels:Array, verify:string[], approve:string[], aeCanApprove:boolean, people:Array}} */
export function approvalChainView(cfg = {}) {
  const verify = asEmailList(cfg.verifyEmails, DEFAULT_VERIFY);
  const approve = asEmailList(cfg.approveEmails, DEFAULT_APPROVE);
  // Can the AE also give final approval? The approval.ae_can_approve switch was RETIRED
  // (2026-07): it let the verifier approve what she had just verified, collapsing
  // maker-checker, and it relaxed sod.verifier_ne_approver to do so. The only remaining way
  // is the EXPLICIT one — her email sitting in the approver list — which is precisely the
  // segregation-of-duties overlap this panel already reports (verifyApproveOverlap).
  const aeCanApprove = verify.some((e) => approve.includes(e));

  // Per-role control state across all SEVEN roles. With no master switch, a role is "under
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
    return 'Faiz is the only approver — under control he can’t approve his own entries, so only the Owner could. Add a second approver.';
  }
  if (roleKey === 'ae' && (view.verify || []).length <= 1) {
    return 'Sughra is the only verifier — under control her own entries can’t be verified (only the Owner could clear them). Add a second verifier.';
  }
  return null;
}

// The Branch-Accountant switch is more than chain routing — it makes the CRM the system of
// record and, because the CRM has no refund path, stops the branch raising refunds at all.
// Kept as a shared constant so the pre-engage caution and the switch card can't drift.
export const BRANCH_ACCOUNTANT_REFUND_CAUTION =
  'Branch Accountant under control makes the CRM the system of record — the branch can no longer hand-raise an SO/PO/GP, an inter-branch deal, a refund or a reissue. The CRM has no refund path, so while this is on nobody in the branch can raise a refund.';

/** Cautions the Owner should see BEFORE a change that turns role controls ON — the same
 *  hazards the per-switch screen shows inline (the sole-verifier / sole-approver deadlock via
 *  roleControlWarning, and the Branch-Accountant CRM-refund lock), computed up front for the
 *  SET of flags an action will enable. `enablingKeys` = the flag keys being switched ON;
 *  `view` = approvalChainView(). Pure & testable. Returns [{ flag, text }] (empty when none
 *  apply). Used to enrich the Enable-all / preset / copy / live-flip confirm messages so a
 *  one-click go-live can't silently create the deadlock the inline guard was built to catch. */
export function engageCautions(enablingKeys = [], view = {}) {
  const on = new Set(enablingKeys || []);
  const out = [];
  // Only FM (sole approver) and AE (sole verifier) can hit the deadlock — mirror the inline guard.
  ['fm', 'ae'].forEach((roleKey) => {
    const flag = `control.role.${roleKey}`;
    if (!on.has(flag)) return;
    const w = roleControlWarning(roleKey, view);
    if (w) out.push({ flag, text: w });
  });
  if (on.has('control.role.branch_accountant')) {
    out.push({ flag: 'control.role.branch_accountant', text: BRANCH_ACCOUNTANT_REFUND_CAUTION });
  }
  return out;
}

/** Policy Tester — given the live config + a hypothetical voucher, does it POST DIRECTLY or
 *  ROUTE to Check → Verify → Approve, and WHY. Mirrors the BE create() guard (Enforcement
 *  Matrix + per-role switches + branch-entry chain). `store` = voucher-policy
 *  store; `flags` = flag-state payload; `rowKey` = a Matrix row (booking/inb/receipt/…);
 *  `role` = a ROLE_SWITCHES key. Returns { routed, reasons:[{rule,detail}] }. Pure. */
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
// ONE console, organised by GOVERNANCE into four heads (+ a Monitoring lens):
//   ① ERP Rules         — mandatory accounting law (locked, read-only)          🔒
//   ② Operational Rules — mandatory process/control law (locked, read-only)     🔒
//   ③ Owner Rules       — the switches / grid / matrix / limits / ceilings /    ⚙
//                         rates the Owner turns on/off or sets (ship OFF, fail-safe)
//   ④ Approval Chain    — who verifies / approves / signs, delegation, break-glass 👤
//   Monitoring          — a read-only lens across all four
// The 564 mandatory laws split by track: ERP Rules = Accounts, Operational Rules = Ops
// (the registry already tags every law `accounts`/`ops`). There is NO master switch —
// enforcement engages rule-by-rule. `key` matches the component's screen router.
export const POWER_SCREENS = [
  { group: 'ERP Rules', items: [
    { key: 'law-erp',      label: 'By Domain' },
  ] },
  { group: 'Operational Rules', items: [
    { key: 'law-ops',      label: 'By Domain' },
    { key: 'roles',        label: 'Role Capabilities' },
    { key: 'masters',      label: 'Master & Onboarding' },
  ] },
  { group: 'Owner Rules', items: [
    { key: 'configurable', label: 'Configurable Rules' },
    { key: 'grid',         label: 'All-Branches Grid' },
    { key: 'matrix',       label: 'Enforcement Matrix' },
    { key: 'limits',       label: 'Limits & Thresholds' },
    { key: 'tester',       label: 'Policy Tester' },
    { key: 'users',        label: 'User Ceilings' },
    { key: 'rates',        label: 'Rates & Values' },
  ] },
  { group: 'Approval Chain', items: [
    { key: 'authority',    label: 'Approval Authority' },
    { key: 'delegation',   label: 'Delegation' },
    { key: 'breakglass',   label: 'Break-Glass Access' },
  ] },
  { group: 'Monitoring', items: [
    { key: 'active',       label: 'Active Controls' },
    { key: 'digest',       label: 'Daily Digest' },
    { key: 'log',          label: 'Change Log / Audit' },
  ] },
  { group: 'Form & Pages', items: [
    { key: 'form-pages',   label: 'Form Directory & Pages' },
  ] },
];

/** Flat list of all screen keys (for the router / tests). */
export const POWER_SCREEN_KEYS = POWER_SCREENS.flatMap((g) => g.items.map((i) => i.key));

// ── Plane ① · ERP Law band ───────────────────────────────────────────────────
// Roll the regrouped Rule Book (regroupRegistry() output, or the bundled RULE_BOOK) into
// the read-only law band the Control Panel shows: per-domain law counts split into the
// app's Accounts / Operations tracks, plus totals. Pure — the panel renders straight from
// it, and the atomic rules stay one click away in the Rule Book. Counts are derived here,
// never hand-typed, so the band can never drift from the registry.
export function lawBand(book = []) {
  const row = (d) => ({ id: d.id, title: d.title, count: (d.rules || []).length, group: d.group });
  const accounts = book.filter((d) => d.group === 'accounts').map(row);
  const ops = book.filter((d) => d.group === 'ops').map(row);
  const sum = (rows) => rows.reduce((n, r) => n + r.count, 0);
  // `all` sums EVERY domain (not just accounts+ops) so the headline count can't undercount if
  // the registry ever carries a domain outside the two known tracks.
  const all = book.reduce((n, d) => n + (d.rules || []).length, 0);
  return {
    accounts,
    ops,
    totals: { accounts: sum(accounts), ops: sum(ops), all, domains: book.length },
  };
}

// ── Screen 1 · DEFAULT RULES — always enforced, not switchable (read-only) ────
// The foundation locks that apply on day one, guard or no guard. maker≠approver and
// payment-prepared≠released are the two SoD rules promoted to always-on when the master
// switch was removed (they only bite on an under-control / money-out voucher).
export const DEFAULT_RULES = [
  { nm: 'Require approval before posting', ds: 'Every voucher starts Pending — nothing hits the books until it is approved.' },
  { nm: 'Maker cannot approve their own routed voucher', ds: 'Once a voucher is under control (routed / reviewChain), its maker cannot give its own final approval — a different person must. A Super Admin overrides the chain (emergency escape hatch). An un-routed voucher can still be self-cleared during the migration.' },
  { nm: 'Payment prepared ≠ Payment released', ds: 'Money-out starts Pending and the maker is barred from releasing it, so a different person must.' },
  { nm: 'Master create ≠ Master approve', ds: 'Faiz creates heads, the Owner approves — never the same hand (locked meta-rule).' },
  { nm: 'Numbering lock (auto only)', ds: 'Voucher numbers are always system-generated at entry — never hand-typed or reset. (The numbering-series master itself stays editable by a Super Admin, Director or Senior Finance Manager.)' },
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
  { nm: 'Master-locked voucher legs change only via their master', ds: 'A voucher that is a leg of a booking (SO/PO/GP), an INB deal, an expense order, or an ADM / ACM register can’t be edited, revoked or deleted directly — every change, including reversing it out of the books, goes through its master (a still-pending INB leg is the one edit exception, for in-place correction).' },
  { nm: 'INB deal is controlled end-to-end', ds: 'An inter-branch deal is gated across its whole lifecycle: approved together as a group its legs post as one unit — if one refuses, the legs that call posted roll back to Pending; a push then needs both legs approved; and once pushed a leg is locked — it can no longer be revoked, so a half-approved deal can never reach the buyer branch.' },
  { nm: 'Full audit trail on every voucher action', ds: 'Approve, edit, revoke, delete, push and un-allocate are all recorded to the audit trail (best-effort — logging never blocks the action).' },
  // ── Revoke & refund integrity ──
  { nm: 'A refund’s original must resolve', ds: 'A refund / reissue that names an original sale/purchase must find it, otherwise it stays Pending — this prevents over-refunding a client.' },
  { nm: 'Revoke needs a reason and fully un-posts', ds: 'A revoke requires a reason and must completely reverse the journal, verified — never a half-revoke. It is hard-blocked when it would break a bank-reconciled or frozen-reconciliation record, a pushed INB deal, a master-locked booking/order leg, or an original that a live refund/reissue reverses. (A settled bill or an aged / closed-period revoke proceeds with a warning, not a block.)' },
  { nm: 'Linked SO/PO/GP pair moves as one', ds: 'A sale and its purchase under one Link No are revoked together — you can’t unwind one side of a booking and leave the other posted.' },
  // ── Masters & access ──
  { nm: 'Ledger integrity', ds: 'Ledger codes are system-generated, ledger names are unique per scope, and a ledger that already has postings can’t be deleted (deactivate it instead).' },
  { nm: 'Branch isolation', ds: 'A branch-scoped user can only view or act on the branches they are assigned; another branch’s record simply returns “not found”.' },
  { nm: 'View-only users can’t write', ds: 'A view-only user is blocked from ERP data writes — they may still renew their own token, change their own password, and use support tickets. (Session sign-out on new login / password change is covered by Single active session and Password strength above.)' },
  { nm: 'Login & password-change integrity', ds: 'A user whose Books access is switched off can’t log in and any live session is evicted on its next request; a password change requires the correct current password and a genuinely different new one.' },
  // ── Authority · who may act (always-on role gates, no flag) ────────────────
  { nm: 'Deleting or reversing posted entries is the Owner’s or Director’s', ds: 'Deleting a voucher, deleting or cancelling an SO/PO/GP booking, deleting an inter-branch deal, or reversing (un-accepting) an ADM / ACM memo is restricted to Super Admin or Director — each one un-posts entries from the books. Everyone else edits instead, which returns the entry to Pending.' },
  { nm: 'Revoke and inter-branch push are approver-only', ds: 'Un-posting an approved voucher or inter-branch deal back to Pending, and pushing an inter-branch deal to the buyer branch, need Super Admin, Director, Senior Finance Manager or Sr. Accounts Executive. An SO/PO/GP booking may additionally be revoked by a Branch Accountant, confined to their own branch. (The CRM integration may also push a deal.)' },
  { nm: 'Verify and Approve are the configured people’s', ds: 'On a routed voucher, level 2 Verify can only be given by the configured verifier and level 3 Approve only by the configured approver (set in app config — Sughra and Faiz by default). A Super Admin can act at any level as an emergency override.' },
  { nm: 'Control config is read by TK Group Central and changed by the Owner', ds: 'Control flags, limits, per-user ceilings, the Enforcement Matrix and period locks are visible to Super Admin, Director, Senior Finance Manager and Sr. Accounts Executive; only a Super Admin can flip them live. Every other central role must propose the change through a change-request.' },
  { nm: 'A change-request can only be acted on by its own chain', ds: 'Approving or rejecting a change-request requires a role that is a level of that request’s chain, and a rejection requires a reason — a Finance Manager cannot clear a change that needs the Director and Owner.' },
  { nm: 'Oversight surfaces are central-only', ds: 'The Control Tower monitor and its lenses, the findings tracker, the Change Log and the export trail are restricted to Super Admin, Director, Senior Finance Manager and Sr. Accounts Executive — a branch-scoped user has no access.' },
  { nm: 'Rules Managers and delegation are the Owner’s', ds: 'Adding, editing, testing, activating or deleting an ERP Rule or a User Rule is Super Admin only, as is granting or revoking a delegation of approval authority. Break-glass access is self-invoked by a central role with a mandatory reason and a bounded timer; only its holder or a Super Admin can end it.' },
  { nm: 'Reconciliation authority follows the tier', ds: 'A Branch Accountant works the Daily and Weekly freeze only; Month / Quarter / Year certification is worked from TK Group Central. Each tier signs in a fixed order — Daily: Branch Accountant → AE · Weekly: Branch Accountant → AE → FM · Month/Quarter/Year: AE → FM → Director → Owner — and only the Owner can re-open a certified reconciliation. The weekly cycle-ledger config is maintained by FM, Director or Owner.' },
  { nm: 'Tally reconciliation is a central control', ds: 'Every Tally tie-out and per-ledger matching screen refuses a branch-scoped user. Imports, matching, freezing and certifying need AE, FM, Director or Owner; the certificate signs AE → FM → Director → Owner; a Director or Owner re-opens a certified period with a reason; and posting or reversing a rounding settlement is FM, Director or Owner.' },
  { nm: 'Inter-branch reconciliation is central', ds: 'Freezing or un-freezing a branch-pair month needs AE, FM, Director or Owner, it certifies AE → FM → Director → Owner, and only a Director or Owner may re-open a certified pair — with a reason.' },
  { nm: 'Control-plane masters are admin-only', ds: 'Approval rules & limits, voucher types, fiscal years, company profile, branches, app config, roles, field access and the document / HSN / VAT / cost-category / asset-category masters can only be written by a Super Admin or Senior Finance Manager (not the Director). Cost centres are Super Admin only; the numbering series also allows the Director; chart bulk-import / move / clone is admin-only. A field the Field Access master marks non-editable for your role is refused on save, naming the field.' },
  { nm: 'User administration and destructive admin ops are gated', ds: 'Creating, editing or deleting a user is Super Admin or Senior Finance Manager; App Access toggles also allow the Director; Page Visibility Control and admin password resets need a Super Admin, a Director or the named page-visibility administrator. Closing a fiscal year is Super Admin or Senior Finance Manager, while force-closing past a failed gate and re-opening a closed year are Super Admin only. Bulk data import is Super Admin / Director. Anyone may raise and triage a support ticket, but only a Super Admin, Director or Senior Finance Manager can delete one.' },
];

// ── Screen 2 · CONFIGURABLE RULES — the Owner's ON/OFF switches, by group ──────
// Every one ships OFF (dormant) and is its own independent switch — no master gate.
// `crit` = a money/critical switch (red accent). Kept as data so the component renders
// them generically and they are testable.
export const CONFIGURABLE_GROUPS = [
  { group: 'Approval & Verification', items: [
    // NOTE: 'Let Sughra also Approve (AE-approve)' was retired (2026-07) — the AE verifies
    // and stops there; final approval is the FM's. Its flag is gone from the backend
    // catalogue, so listing it here would 422 every bulk write (set-many validates the
    // whole batch up front). Pinned absent by __tests__/controlPanel.test.js.
    { nm: 'Branch Accountant under control', crit: true, ds: "ON = the Branch Accountant works CRM-sourced documents instead of raising them. They can no longer create an SO/PO/GP, an inter-branch deal, a refund or a reissue by hand — those arrive from the CRM; their job is to correct what arrives and Check it, which hands it to Sughra and locks it to them until she rejects it back. Their entries walk Check → Verify → Approve. OFF = acts independently, raises anything, no approval required. CAUTION: the CRM sends sale bookings only — it has no refund or reissue path — so while this is ON nobody in the branch can raise a refund. Preview impact before engaging.", flag: 'control.role.branch_accountant' },
    { nm: 'Accounts Executive (Sughra) under control', ds: "ON = Sughra's entries walk the approval chain. OFF = acts independently.", flag: 'control.role.ae' },
    { nm: 'Senior Finance Manager (Faiz) under control', ds: "ON = Faiz's entries walk the approval chain — FM can no longer single-step approve their own. OFF = acts independently.", flag: 'control.role.fm' },
    { nm: 'Branch Manager under control', ds: "ON = a Branch Manager's entries walk the approval chain. OFF = acts independently.", flag: 'control.role.branch_manager' },
    { nm: 'General Manager under control', ds: "ON = a General Manager's entries walk the approval chain. OFF = acts independently.", flag: 'control.role.general_manager' },
    { nm: 'Director (Farhan) under control', ds: "ON = Farhan's entries walk the approval chain. OFF = acts independently.", flag: 'control.role.director' },
    { nm: 'Owner (Afshin) under control', ds: "ON = Afshin's entries walk the approval chain. OFF = acts independently. Note: a Super Admin can still override the chain.", flag: 'control.role.owner' },
  ] },
  { group: 'Segregation of Duties', items: [
    { nm: 'Verifier ≠ Approver on the same voucher', ds: 'ON = Check → Verify → Approve pass through different hands on the same voucher. Nothing relaxes it. OFF = not separately enforced.', flag: 'sod.verifier_ne_approver' },
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

/** Build the ALL-BRANCHES POSTURE GRID model from the raw flag state — the bird's-eye view.
 *  Rows = the configurable flags (kept grouped); columns = each branch `code`. Each cell is
 *  { on, override }: `on` is the flag's EFFECTIVE state for that branch (branch override →
 *  global), `override` is true when the branch carries an explicit value (vs inheriting the
 *  Group default). The 'default'/'ALL' column is the global value (never an "override"). Pure
 *  & testable — mirrors isFlagOn so the grid shows exactly what enforces per branch. */
export function postureGrid(flagState, branchCodes = []) {
  const flags = (flagState && flagState.flags) || {};
  const isDefaultCol = (c) => !c || c === 'default' || c === 'ALL';
  return CONFIGURABLE_GROUPS.map((g) => ({
    group: g.group,
    rows: g.items.map((it) => {
      const f = flags[it.flag] || {};
      const cells = {};
      branchCodes.forEach((code) => {
        const hasOverride = !isDefaultCol(code) && f.branches && Object.prototype.hasOwnProperty.call(f.branches, code);
        cells[code] = { on: isFlagOn(flagState, it.flag, code), override: !!hasOverride };
      });
      return { key: it.flag, nm: it.nm, crit: !!it.crit, cells };
    }),
  }));
}

// ── Posture presets — named go-live bundles (pure data) ──────────────────────
// Each preset is the set of configurable flags it turns ON; applying it turns every OTHER
// configurable flag OFF for the scope. Applied via the bulk set-many endpoint. Order = the
// escalation from lightest to full control.
export const POSTURE_PRESETS = [
  { key: 'conservative', label: 'Conservative', desc: 'Approval basics — the Branch Accountant works CRM-sourced documents (no hand-raised bookings or refunds) and their entries walk the chain.',
    flags: ['control.role.branch_accountant'] },
  { key: 'standard', label: 'Standard', desc: 'Conservative + verifier≠approver, large-voucher escalation, mandatory documents, export logging and the period lock. (Branch Accountant on CRM-sourced documents — no hand-raised refunds.)',
    flags: ['control.role.branch_accountant', 'sod.verifier_ne_approver', 'approval.escalation_signoffs', 'entry.mandatory_docs', 'reports.log_exports', 'masters.period_lock'] },
  { key: 'strict', label: 'Strict', desc: 'Every configurable rule on — the full control layer: the Branch Accountant on CRM-sourced documents (no hand-raised refunds) and every role (incl. Owner) under control.',
    flags: CONFIGURABLE_FLAGS },
];

/** Bulk changes to apply a preset for a scope: every configurable flag set to whether the
 *  preset includes it, for `branch` ('default'/'ALL'/'' = Group global). Pure & testable. */
export function presetChanges(preset, branch) {
  const on = new Set((preset && preset.flags) || []);
  return CONFIGURABLE_FLAGS.map((key) => ({ key, enabled: on.has(key), branch }));
}

/** Bulk changes to COPY the effective configurable posture of `sourceBranch` onto each of
 *  `targetBranches` — for every configurable flag, set the target's value to the source's
 *  EFFECTIVE value (a target equal to the source is skipped). Pure (reads the flag state). */
export function copyBranchChanges(flagState, sourceBranch, targetBranches = []) {
  const out = [];
  targetBranches.forEach((t) => {
    if (t === sourceBranch) return;
    CONFIGURABLE_FLAGS.forEach((key) => out.push({ key, enabled: isFlagOn(flagState, key, sourceBranch), branch: t }));
  });
  return out;
}

/** Bulk changes to RESET a branch to the Group default — clears every configurable flag's
 *  branch override (enabled:null) so the branch inherits the global value again. This is the
 *  path back from override → inherit. No-op on the 'default' scope. Pure. */
export function resetBranchChanges(branch) {
  if (!branch || branch === 'default' || branch === 'ALL') return [];
  return CONFIGURABLE_FLAGS.map((key) => ({ key, enabled: null, branch }));
}

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
  // Enter is CONDITIONAL for the Branch Accountant: under control they keep entering their own
  // book-keeping (payments · receipts · journals · contras) but can no longer raise the four
  // CRM-sourced documents (SO/PO/GP · inter-branch · refund · reissue).
  { role: 'Branch Accountant', caps: ['cond', 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },
  // Approve stays CONDITIONAL for the AE only in the explicit sense: she approves nothing
  // unless the Owner names her in approval.approveEmails (the AE-approve switch is retired).
  { role: 'Sughra · AE',       caps: ['cond', 'full', 'cond', 'none', 'none', 'none', 'none', 'full'] },
  { role: 'Faiz · FM',         caps: ['cond', 'full', 'full', 'full', 'full', 'full', 'cond', 'full'] },
  { role: 'Farhan · Director', caps: ['none', 'cond', 'none', 'none', 'none', 'none', 'cond', 'full'] },
  { role: 'Afshin · Owner',    caps: ['full', 'full', 'full', 'full', 'full', 'full', 'full', 'full'] },
];
