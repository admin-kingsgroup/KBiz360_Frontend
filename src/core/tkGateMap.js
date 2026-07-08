// ─── TK GROUP CENTRAL · Gate-Map (Phase 0) ───────────────────────────────────
// The machine-readable contract behind the Central-vs-Branch model. Every route
// resolves to ONE verdict:
//
//   central  🟥  TK Group Central only — must NOT appear on a branch surface,
//                 must NOT accept a branch-context write (server-guarded).
//   branch   🟦  Branch accountant operates it; central reviews via Focus (same
//                 component, `branch = focus`).
//   split    🟨  Doing in Branch, authority in Central (reconcile→sign-off,
//                 prepare→file, raise→decide).
//   everyone 🟩  Personal / self-service — every user, any branch.
//
// This module is DATA + a classifier only — it changes NO runtime behaviour on its
// own. Phase 3 (menu re-gate) and the server write-guards consume it; the guard
// test (tkGateMap.guard.test.js) asserts no `central` route ever reaches a branch
// menu, minus the PENDING_MIGRATION allowlist which shrinks to [] as phases land.
//
// Derived from core/menus.js + the placement map (Rev 3). Keep verdicts here in
// sync with that map — this file is the single source of truth the build checks.

export const CENTRAL = 'central';
export const BRANCH = 'branch';
export const SPLIT = 'split';
export const EVERYONE = 'everyone';

// Exact-route exceptions that override the family prefix rules below.
const OVERRIDES = {
  // Landing / role homes
  '/dashboard': BRANCH,                    // branch accountant landing (the /dashboard/* family is central)
  '/accounts/dashboard': BRANCH,           // Dashboard Accountant — the branch home

  // Accounts family — the money-out / period-close / control items are CENTRAL
  '/accounts/payment-run': CENTRAL,        // Payment Run / Batch Pay — central release
  '/accounts/payment-verification': CENTRAL,
  '/accounts/suspense': CENTRAL,           // Suspense / Unspecified clearing — central approve
  '/accounts/net-ageing': BRANCH,

  // Reconciliation — branch does it, central signs off
  '/accounts/client-reco': SPLIT,
  '/accounts/supplier-reco': SPLIT,
  '/accounts/tally-reco': SPLIT,
  '/accounts/interbranch-reco': SPLIT,
  '/accounts/month-end': SPLIT,            // submit checklist → central locks
  '/bank-reco': SPLIT,
  '/finance/reco-queue': SPLIT,

  // Approvals authority + INB approvals — central
  '/transactions/approvals': CENTRAL,
  '/transactions/inb-approvals': CENTRAL,
  '/transactions/voucher-tabs': BRANCH,    // entry helper

  // Operational registers / Branch MIS — BRANCH even though under /reports/*
  '/reports/pnl': BRANCH,
  '/reports/bs': BRANCH,
  '/reports/cash-position': BRANCH,
  '/reports/sreg': BRANCH,
  '/reports/preg': BRANCH,
  '/reports/rec': BRANCH,
  '/reports/pay': BRANCH,
  '/reports/client-statement': BRANCH,
  '/reports/customer-360': BRANCH,
  '/reports/supplier-360': BRANCH,
  '/reports/audit-trail': BRANCH,          // shared — branch view, central oversight
  '/reports/inb-sreg': BRANCH,
  '/reports/inb-preg': BRANCH,
  '/reports/tally-export': CENTRAL,        // export of books — central-controlled
  // Tax reports live under the branch Tax pill — tax is SPLIT (branch prepares &
  // views, central files), so these are NOT central despite the /reports/ family.
  '/reports/tax-summary': SPLIT,           // GST / VAT Summary (Return)
  '/reports/statutory-dues': SPLIT,        // Statutory Dues Calendar
  '/reports/tax-board': SPLIT,             // Tax Filing Status Board

  // Finance family — the analytical / targets items are CENTRAL (rest branch)
  '/finance/targets': CENTRAL,
  '/finance/investments': CENTRAL,
  '/finance/module-register': CENTRAL,
  '/finance/module-sales-register': CENTRAL,
  '/finance/module-purchase-register': CENTRAL,
  '/reports/invoice-gp': CENTRAL,
  '/reports/sales-gp-analytics': CENTRAL,

  // Settings — personal preferences are the ONE everyone-exception
  '/settings/preferences': EVERYONE,

  // TK — decisions is raised by branches (split), rest of /tk/* is central
  '/tk/decisions': SPLIT,

  // HR self-service — every employee, any branch
  '/hr/portal': EVERYONE,
  '/hr/leave-apply': EVERYONE,
  '/hr/reimbursement': EVERYONE,
  '/hr/my-payslip': EVERYONE,
  '/hr/investment-declaration': EVERYONE,
  '/hr/form-16': EVERYONE,
  '/hr/performance': EVERYONE,
  '/hr/feedback-360': EVERYONE,
  '/hr/skills': EVERYONE,

  // Bulk data import — central-controlled
  '/import': CENTRAL,

  // Support — everyone raises tickets
  '/support/tickets': EVERYONE,
};

// Family prefix rules — longest match wins. Anything unmatched defaults to BRANCH
// (safe: never over-blocks; a genuinely central route in a branch menu is caught
// by an explicit prefix/override above).
const PREFIX = [
  ['/masters/', CENTRAL],
  ['/accounting/', CENTRAL],
  ['/dashboards/', CENTRAL],
  ['/dashboard/', CENTRAL],   // /dashboard/owner · /director · /alerts  (/dashboard exact = branch, see OVERRIDES)
  ['/settings/', CENTRAL],
  ['/assets/', CENTRAL],
  ['/tk/', CENTRAL],
  ['/hr/', CENTRAL],
  ['/reports/', CENTRAL],
  ['/tax/', SPLIT],
  ['/finance/', BRANCH],
  ['/accounts/', BRANCH],
  ['/purchase/', BRANCH],
  ['/sales/', BRANCH],
  ['/bookings/', BRANCH],
];

// Resolve a route to its verdict. Overrides first, then the longest matching
// family prefix, else BRANCH.
export function verdictOf(route) {
  if (!route || typeof route !== 'string') return BRANCH;
  if (Object.prototype.hasOwnProperty.call(OVERRIDES, route)) return OVERRIDES[route];
  let best = BRANCH;
  let bestLen = -1;
  for (const [p, v] of PREFIX) {
    if (route.startsWith(p) && p.length > bestLen) { best = v; bestLen = p.length; }
  }
  return best;
}

export const isCentral = (route) => verdictOf(route) === CENTRAL;
export const isBranch = (route) => verdictOf(route) === BRANCH;
export const isSplit = (route) => verdictOf(route) === SPLIT;
export const isEveryone = (route) => verdictOf(route) === EVERYONE;

// ─── PENDING_MIGRATION ───────────────────────────────────────────────────────
// Central-verdict routes that STILL sit on the branch-accountant surface today,
// pending the Phase 3 menu re-gate. The guard test tolerates exactly these and no
// others — so the moment a NEW central route leaks onto a branch menu the build
// fails, while this set documents the precise Phase-3 work list. It must shrink to
// an empty set when Phase 3 completes.
export const PENDING_MIGRATION = new Set([
  // Accounts Master (Chart of Accounts + costing + planning) — all move to Central
  '/masters/groups',
  '/masters/ledgers',
  '/masters/accounts-tree',
  '/masters/bank-accounts',
  '/masters/currency',
  '/masters/forex',
  '/masters/cost-categories',
  '/masters/cost-centers',
  '/masters/budgets',
  '/masters/scenarios',
  // Money-out / period-close / control items under Accounts
  '/accounts/payment-run',
  '/accounting/vendor-advances',
  '/accounts/suspense',
  '/accounting/year-close',
  '/accounting/recurring',
  '/accounts/payment-verification',
  // Approval authority currently exposed as a branch pill
  '/transactions/approvals',
  '/transactions/inb-approvals',
]);
