import { LayoutDashboard, CheckSquare, Lock, Database, Users, BarChart2, Activity, Rocket, Calculator, ShieldCheck } from 'lucide-react';
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
  const isOwner = (currentUser && currentUser.role) === 'Super Admin';
  const usersAccess = isOwner ? [{ label: 'Users & Access', children: [
    { label: 'Users & Roles', href: '/settings/users' },
    { label: 'App Access', href: '/settings/users' },
    { label: 'Bulk User Operations', href: '/settings/bulk-users' },
    { label: 'Page Visibility Control', href: '/settings/page-access' },
    { label: 'Permissions Matrix', href: '/settings/permissions-matrix' },
    { label: 'Field-Level Access', href: '/settings/field-access' },
    { label: 'Approval Matrix Builder', href: '/settings/approval-matrix-builder' },
    { label: 'Authority Configuration', href: '/settings/authority-config' },
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
  return [
    // Overview — the cockpit landing.
    { label: 'Control Tower', icon: LayoutDashboard, href: '/tk/control-tower' },

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

    // Control & Configuration — the Power Console + the rules it governs.
    { label: 'Control & Configuration', icon: Lock, children: [
      { label: 'Power Console', children: [
        { label: 'Control Panel', href: '/tk/control-panel' },
        { label: 'Control Flags', href: '/tk/controls' },
        { label: 'Thresholds & Limits', href: '/tk/limits' },
      ] },
      { label: 'Rules & Requests', children: [
        { label: 'Period Locks', href: '/tk/period-locks' },
        { label: 'Targets & Budgets', href: '/tk/targets' },
        { label: 'Master Control (request)', href: '/tk/master-control' },
      ] },
    ] },

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

    // Monitoring — live drill-downs.
    { label: 'Monitoring', icon: Activity, children: [
      { label: 'Live Drill-downs', children: [
        { label: 'ERP Adoption', href: '/tk/adoption' },
        { label: 'Close Readiness & Integrity', href: '/tk/integrity' },
        { label: 'Branch Cockpit', href: '/tk/branch-cockpit' },
        { label: 'Audit Trail', href: '/tk/audit' },
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
const COCKPIT_PREFIXES = ['/tk/', '/dashboard/', '/dashboards/', '/masters/', '/hr/', '/settings/', '/support/'];
export function isCockpitRoute(route) {
  return !!route && (route === '/dashboard' || COCKPIT_PREFIXES.some((p) => route.startsWith(p)));
}
