import { ArrowLeftRight, LayoutDashboard, CheckSquare, Lock, Database, Users, BarChart2, Rocket, Calculator, ShieldCheck, Scale } from 'lucide-react';
import { FULL_SCOPE_ROLES } from '../../core/branchScope';
import { dashboardsFor, MENU_ACCOUNTS } from '../../core/menus';

// ─── TK GROUP CENTRAL · the control cockpit ──────────────────────────────────
// Selecting "TK Group Central" in the branch selector ENTERS the central control
// system: the whole control layer becomes the primary nav (book-less — no branch
// data-entry here). Only the four central-scope roles can select the consolidated
// entity, so this mode is inherently central-only. It surfaces the /tk control pages
// PLUS the existing oversight dashboards, master/ledger and HR governance screens —
// all reached only from Central. Amounts are always shown BRANCHWISE, never blended.

export function isCentralRole(currentUser) {
  return FULL_SCOPE_ROLES.includes(currentUser && currentUser.role);
}

// Accounts workspace — shown ONLY when a branch is spotlighted via Focus. It is the
// SAME "Accounts" pill the branch surface carries (MENU_ACCOUNTS is the single source
// of truth), relabelled to the focused branch — so a central user does Data Entry AND
// sees the full Reports/Registers/Books/MIS/Reconciliation tree for that branch, in one
// place, identical to what a Branch Accountant sees. Every route reuses the exact branch
// route and operates on the focused branch (App re-scopes the operating branch to Focus).
// Focus = ALL → not shown (the consolidated cockpit is book-less; there's nothing to
// enter against a group total).
//
// Masters are the one deliberate omission: the cockpit already surfaces the chart/party
// masters centrally via the "Masters & Ledger" pill, so the "Accounts Master" group is
// dropped here to avoid listing the same masters twice inside one nav.
function branchWorkspace(focus) {
  const focused = focus && focus !== 'ALL';
  if (!focused) return [];
  const children = (MENU_ACCOUNTS.children || []).filter((c) => c && c.label !== 'Accounts Master');
  return [{ label: `Accounts — ${focus}`, icon: Calculator, children }];
}

// Administration — the org-wide admin panel, central by nature (one user list, one set
// of roles/permissions/config for the whole group). It lives HERE, not on the branch
// surface. The sensitive Users & Access column shows ONLY for the Owner / Super Admin;
// a Director/FM in the cockpit sees org-config + integrations but not user creation.
function administration(currentUser) {
  const isOwner = ['Super Admin', 'super_admin'].includes(currentUser && currentUser.role);
  const usersAccess = isOwner ? [{ label: 'Users & Access', children: [
    { label: 'Users & Roles', href: '/settings/users' },
    { label: 'App Access', href: '/settings/users' },
    { label: 'Bulk User Operations', href: '/settings/bulk-users' },
    { label: 'Page Visibility Control', href: '/settings/page-access' },
    { label: 'Permissions Matrix', href: '/settings/permissions-matrix' },
    { label: 'Field-Level Access', href: '/settings/field-access' },
    { label: 'Approval Matrix Builder', href: '/settings/approval-matrix-builder' },
  ] }] : [];
  return { label: 'Administration', icon: ShieldCheck, children: [
    ...usersAccess,
    { label: 'Organisation & Config', children: [
      { label: 'Branches', href: '/settings/branches' },
      { label: 'Numbering Series', href: '/masters/numbering' },
      { label: 'Custom Fields', href: '/settings/custom-fields' },
      { label: 'Vacation Delegations', href: '/settings/delegations' },
      { label: 'Approval Workflow', href: '/settings/approval-workflow' },
      { label: 'Master Change Queue', href: '/settings/master-change-queue' },
      { label: 'Statutory Filing Register', href: '/settings/filing-register' },
    ] },
    { label: 'Templates & Integrations', children: [
      { label: 'Document Templates', href: '/settings/doc-templates' },
      { label: 'Email / SMS Templates', href: '/settings/email-templates' },
      { label: 'Branding', href: '/settings/branding' },
      { label: 'Banking API', href: '/settings/banking-api' },
      { label: 'GSP / IRP E-Invoice', href: '/settings/gsp-irp' },
      { label: 'API & Integrations', href: '/settings/integrations' },
      { divider: true, label: 'Audit' },
      { label: 'Audit Log', href: '/settings/audit' },
    ] },
  ] };
}

export function controlCockpitMenu(focus, currentUser) {
  const isOwner = ['Super Admin', 'super_admin'].includes(currentUser && currentUser.role);
  return [
    // Dashboards — all dashboards in one place, segregated by role. The AD Dashboards
    // (and the owner-only AD Dashboard All) are folded in ONLY for the Owner / Super
    // Admin; other central roles get the role-appropriate set (dashboardsFor decides).
    { ...dashboardsFor(currentUser), icon: LayoutDashboard },

    // Accounts — the branch's full Accounts pill (Data Entry + Reports), only when focused.
    ...branchWorkspace(focus),

    // Approvals — the two queues, then the governance raise-points. Grouped (not loose
    // leaves) so the dropdown renders as titled columns like every other cockpit menu —
    // never a mix of featured pills + plain text (see the shared MegaPanel renderer).
    { label: 'Approvals', icon: CheckSquare, children: [
      { label: 'Approve', children: [
        { label: 'Approvals — Vouchers', href: '/tk/voucher-approvals' },
        { label: 'Admin Approval', href: '/tk/approvals' },
      ] },
      { label: 'Raise / Govern', children: [
        { label: 'Decisions', href: '/tk/decisions' },
        { label: 'Onboarding', href: '/tk/onboarding' },
      ] },
    ] },

    // Reconciliation — the 4-tier per-ledger certificate ladder (Weekly → Month-End →
    // Quarterly → Year-End). The central view is oversight of the SAME module: the
    // pages carry their own branch chips, so everything stays BRANCHWISE, never blended.
    { label: 'Statement Reconciliation', icon: ArrowLeftRight, children: [
      // One entry per tier — the menu is the tier switch (pages are tier-locked).
      // Reconciliation Hub = the full-view dashboard; Certification = sign-off.
      { label: 'Reconciliation Hub', children: [
        { label: 'Weekly Reconciliation', href: '/reconciliation/hub/weekly' },
        { label: 'Monthly Reconciliation', href: '/reconciliation/hub/monthly' },
        { label: 'Quarterly Reconciliation', href: '/reconciliation/hub/quarterly' },
        { label: 'Yearly Reconciliation', href: '/reconciliation/hub/yearly' },
      ] },
      { label: 'Certification', children: [
        { label: 'Weekly Certification', href: '/reconciliation/weekly' },
        { label: 'Monthly Certification', href: '/reconciliation/monthly' },
        { label: 'Quarterly Certification', href: '/reconciliation/quarterly' },
        { label: 'Yearly Certification', href: '/reconciliation/yearly' },
      ] },
      { label: 'Reports', children: [
        { label: 'Weekly Report', href: '/reconciliation/reports/weekly' },
        { label: 'Monthly Report', href: '/reconciliation/reports/monthly' },
        { label: 'Quarterly Report', href: '/reconciliation/reports/quarterly' },
        { label: 'Yearly Report', href: '/reconciliation/reports/yearly' },
      ] },
      // Statement matching moved OUT of the Accounts pill — Central must still
      // reach it (Month/Quarter/Year closings are worked from here).
      { label: 'Statement Matching', children: [
        { label: 'Client Reconciliation', href: '/accounts/client-reco' },
        { label: 'Bank Reconciliation', href: '/bank-reco' },
        { label: 'Reconciliation Queue', href: '/finance/reco-queue' },
        { label: 'Supplier Reconciliation', href: '/accounts/supplier-reco' },
        { label: 'Inter-Branch Reconciliation', href: '/accounts/interbranch-reco' },
        { label: 'Match Guide', href: '/reconciliation/match-guide' },
      ] },
      { label: 'Govern', children: [
        { label: 'Rule Book & Process', href: '/reconciliation/rulebook' },
      ] },
    ] },

    // Tally Reconciliation — whole-books ERP↔Tally tie-out, its own pill. EVERYTHING
    // Tally lives here: the tie-out board, the per-ledger Day Book matcher (moved
    // out of Statement Matching), and the staff Guide.
    { label: 'Tally Reconciliation', icon: Scale, children: [
      { label: 'Tie-Out', children: [
        { label: 'Monthly Tie-Out', href: '/tally-reconciliation/monthly' },
        { label: 'Yearly Tie-Out', href: '/tally-reconciliation/yearly' },
      ] },
      // The certification register — the "which period is certified" overview per tier
      // (status · sign chain · frozen snapshot). Mirrors MENU_TALLY_RECON (branch nav).
      { label: 'Certification', children: [
        { label: 'Monthly Certification', href: '/tally-reconciliation/certification/monthly' },
        { label: 'Yearly Certification', href: '/tally-reconciliation/certification/yearly' },
      ] },
      // Per-tier report: pending closings · certificate register · open blockers.
      { label: 'Reports', children: [
        { label: 'Monthly Report', href: '/tally-reconciliation/reports/monthly' },
        { label: 'Yearly Report', href: '/tally-reconciliation/reports/yearly' },
      ] },
      { label: 'Vouchers', children: [
        { label: 'Ledger Matcher (Day Book)', href: '/accounts/tally-reco' },
      ] },
      { label: 'Help', children: [
        { label: 'Tally Reconciliation Guide', href: '/tally-reconciliation/guide' },
      ] },
    ] },

    // Control & Configuration — the Control Tower (+ its lenses), the Power Console,
    // and the rules it governs. The Control Tower now lives here as the first column.
    { label: 'Control & Configuration', icon: Lock, children: [
      { label: 'Control Tower', children: [
        { label: 'Control Tower', href: '/tk/control-tower' },
        { label: 'ERP Health Scorecard', href: '/tk/health-scorecard' },
        { label: 'Control Tower — by Module', href: '/tk/modules' },
        { label: 'ERP Adoption', href: '/tk/adoption' },
        { label: 'Close Readiness & Integrity', href: '/tk/integrity' },
      ] },
      { label: 'Power Console', children: [
        { label: 'Control Panel', href: '/tk/control-panel' },
        { label: 'Control Flags', href: '/tk/controls' },
        { label: 'Thresholds & Limits', href: '/tk/limits' },
      ] },
      { label: 'Rules & Requests', children: [
        // Owner-only: the rules engine, split into two entries — ERP monitoring rules and
        // per-user access rules. Both open the same tabbed page on their respective tab.
        ...(isOwner ? [
          { label: 'ERP Rules Manager', href: '/tk/rules' },
          { label: 'User Control Center', href: '/tk/user-rules' },
        ] : []),
        { label: 'Period Locks', href: '/tk/period-locks' },
        { label: 'Targets & Budgets', href: '/tk/targets' },
        { label: 'Master Control (request)', href: '/tk/master-control' },
      ] },
      { label: 'Monitoring', children: [
        { label: 'Branch Cockpit', href: '/tk/branch-cockpit' },
        { label: 'Audit Trail', href: '/tk/audit' },
      ] },
    ] },

    // (The Rules Manager now lives INSIDE Control & Configuration → Rules & Requests,
    // as "ERP Rules Manager" — a tabbed page holding ERP Rules + User Rules.)

    // Administration — the org-wide admin panel (users / roles / access / config /
    // integrations). Central by nature; the branch surface no longer carries it.
    administration(currentUser),

    // Masters & Ledger — the chart of accounts + party masters (central-approved).
    { label: 'Masters & Ledger', icon: Database, children: [
      { label: 'Chart & Ledgers', children: [
        { label: 'Chart of Accounts', href: '/masters/accounts-tree' },
        { label: 'Ledger Masters', href: '/masters/ledgers' },
        { label: 'Account Groups', href: '/masters/groups' },
      ] },
      { label: 'Party Masters', children: [
        { label: 'Customers', href: '/masters/customers' },
        { label: 'Suppliers', href: '/masters/suppliers' },
      ] },
    ] },

    // Performance & Oversight — branchwise analytics (never blended).
    { label: 'Performance & Oversight', icon: BarChart2, children: [
      { label: 'Performance', children: [
        { label: 'Branch Scorecard', href: '/tk/scorecard' },
        { label: 'Performance vs Target', href: '/tk/performance' },
        { label: 'Profitability', href: '/tk/profitability' },
      ] },
      { label: 'Capital & Assets', children: [
        { label: 'Investment & Capital', href: '/tk/investment' },
        { label: 'Assets Central', href: '/tk/assets' },
        { label: 'Receivables & Payables', href: '/tk/receivables-payables' },
      ] },
      { label: 'Risk & Close', children: [
        { label: 'Exceptions & Risk', href: '/tk/exceptions' },
        { label: 'Compliance & Close', href: '/tk/compliance' },
        { label: 'Central Tax Desk', href: '/tk/tax-desk' },
      ] },
    ] },

    // HR Control — governance + the HR screens.
    { label: 'HR Control', icon: Users, children: [
      { label: 'Governance', children: [
        { label: 'HR Requests', href: '/tk/hr-control' },
      ] },
      { label: 'HR Screens', children: [
        { label: 'Employees', href: '/hr/employees' },
        { label: 'Payroll', href: '/hr/payroll' },
        { label: 'Attrition', href: '/hr/attrition' },
        { label: 'Recruitment', href: '/hr/recruitment' },
      ] },
    ] },

    // Setup & Roles — readiness, the go-live switch, and who does what.
    { label: 'Setup & Roles', icon: Rocket, children: [
      { label: 'Setup', children: [
        { label: 'Configuration Readiness', href: '/tk/readiness' },
        { label: 'Go-Live', href: '/tk/go-live' },
      ] },
      { label: 'Roles', children: [
        { label: 'My Role', href: '/tk/my-role' },
        { label: 'Roles & Responsibilities', href: '/tk/roles' },
      ] },
    ] },
  ];
}

// Routes reachable inside TK Group Central: the /tk control pages, the oversight
// dashboards and master/HR governance screens surfaced in the cockpit, PLUS the cross-
// cutting pages the app bar / user menu offer everywhere (personal profile & prefs
// under /settings, and Support). Only branch-OPERATIONAL pages (data-entry, branch
// books/registers, tax) are out of the control mode and bounce back to Control Tower.
// '/dashboard/' covers the role-segregated dashboards surfaced in the cockpit (incl. the
// owner-only /dashboard/owner); '/dashboards/' covers the AD Dashboards group.
const COCKPIT_PREFIXES = ['/tk/', '/dashboard/', '/dashboards/', '/masters/', '/hr/', '/settings/', '/support/', '/reconciliation/', '/tally-reconciliation/'];
// Statement-matching screens (moved out of the Accounts pill) — reachable from
// Central because Month/Quarter/Year closings are worked here; each page stays
// branch-wise via its own selectors.
const COCKPIT_EXACT = new Set([
  '/dashboard', '/reconciliation',
  '/accounts/client-reco', '/bank-reco', '/finance/reco-queue',
  '/accounts/supplier-reco', '/accounts/interbranch-reco', '/accounts/tally-reco',
]);
export function isCockpitRoute(route) {
  // '/reconciliation' — Month/Quarter/Year closings are DONE from TK Group Central
  // (AE/FM/Director/Owner); the pages themselves stay branch-wise via their chips.
  return !!route && (COCKPIT_EXACT.has(route) || COCKPIT_PREFIXES.some((p) => route.startsWith(p)));
}
