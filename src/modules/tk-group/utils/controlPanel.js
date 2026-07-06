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
    { nm: 'Master-creation lock', ds: "Branches can't create ledgers / parties — central only.", st: 'open during migration' },
    { nm: 'Field locks (PAN · bank · credit-limit)', ds: 'Sensitive party fields become central-request only.' },
    { nm: 'Period lock', ds: "Branches can't post into a closed / filed period." },
    { nm: 'Numbering lock (auto only)', ds: 'No manual voucher-number resets.' },
    { nm: 'Branch profitability visibility', ds: 'ON = branches see own P&L / GP / MIS. OFF = hidden.', st: 'hidden by default' },
    { nm: 'Relocate central screens off branch', ds: 'Masters · approvals · money-out move to TK Group only.', st: 'branch menu unchanged', flag: 'branch.central_relocated' },
    { nm: 'Wired-ledger lock', ds: 'Module / tax / inter-branch heads locked for everyone.' },
  ],
  sod: [
    { nm: 'A maker cannot approve their own voucher', ds: 'The person who entered it is barred from its approval.' },
    { nm: 'Verifier ≠ Approver on the same voucher', ds: 'Two different people must clear each entry.' },
    { nm: 'Master create ≠ Master approve', ds: 'Faiz creates; the Owner approves — never the same hand.', st: 'locked chain applies' },
    { nm: 'Payment prepared ≠ Payment released', ds: 'Dual authorisation on money out.', crit: true },
  ],
  security: [
    { nm: 'Require 2-factor authentication', ds: 'Every user enrols a second factor at login.' },
    { nm: 'Login working-hours window', ds: 'Off-hours logins → view-only or denied.' },
    { nm: 'IP / location allow-list', ds: 'Restrict logins to known office IPs.' },
    { nm: 'Single active session per user', ds: 'Block concurrent logins on multiple devices.' },
    { nm: 'Password policy (rotation + strength)', ds: 'Enforce complexity and periodic reset.' },
  ],
  entry: [
    { nm: 'Block future-dated entries', ds: 'No posting beyond today (travel dates excepted).' },
    { nm: 'Duplicate detection', ds: 'Warn / block a repeat of the same invoice / voucher.' },
    { nm: 'GP-floor block', ds: 'A booking under the GP floor needs central approval.' },
    { nm: 'Mandatory documents', ds: 'Require attachments on defined voucher types.' },
    { nm: 'Tax filing lock', ds: 'A filed period locks — no edits after filing.' },
    { nm: 'Reconciliation before close', ds: "A period can't close until bank/client/supplier recon is signed off." },
  ],
  notifications: [
    { nm: 'Approval-request alerts', ds: 'Notify the next approver when a voucher reaches their level.' },
    { nm: 'Stale-approval SLA + escalation', ds: 'Auto-remind, then escalate an item sitting too long.' },
    { nm: 'Exception & risk alerts', ds: 'GP≤0 · negative cash · over-limit surface to central.' },
    { nm: 'Daily digest to Owner / Director', ds: 'One summary of pending, exceptions and close status.' },
  ],
  reports: [
    { nm: 'Restrict export of sensitive data', ds: 'Only granted users may export ledgers / registers / P&L.' },
    { nm: 'Watermark & log every export', ds: 'Stamp who exported what, when — logged to the audit trail.' },
    { nm: 'Block branch export of group reports', ds: 'Consolidated / cross-branch reports never leave via a branch.' },
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
