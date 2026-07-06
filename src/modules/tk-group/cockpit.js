import { LayoutDashboard, CheckSquare, Lock, Database, Users, BarChart2, Activity, Rocket } from 'lucide-react';
import { FULL_SCOPE_ROLES } from '../../core/branchScope';

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

export function controlCockpitMenu() {
  return [
    // Overview — the cockpit landing.
    { label: 'Control Tower', icon: LayoutDashboard, href: '/tk/control-tower' },

    // Approvals & Governance — the daily clearing work.
    { label: 'Approvals & Governance', icon: CheckSquare, children: [
      { label: 'Approvals', href: '/tk/approvals' },
      { label: 'Voucher Approvals', href: '/tk/voucher-approvals' },
      { label: 'Decisions', href: '/tk/decisions' },
      { label: 'Onboarding', href: '/tk/onboarding' },
    ] },

    // Control & Configuration — the Power Console + the rules it governs.
    { label: 'Control & Configuration', icon: Lock, children: [
      { label: 'Control Panel', href: '/tk/control-panel' },
      { label: 'Control Flags', href: '/tk/controls' },
      { label: 'Thresholds & Limits', href: '/tk/limits' },
      { label: 'Period Locks', href: '/tk/period-locks' },
      { label: 'Targets & Budgets', href: '/tk/targets' },
      { label: 'Master Control (request)', href: '/tk/master-control' },
    ] },

    // Masters & Ledger — the chart of accounts + party masters (central-approved).
    { label: 'Masters & Ledger', icon: Database, children: [
      { label: 'Chart of Accounts', href: '/masters/accounts-tree' },
      { label: 'Ledger Masters', href: '/masters/ledgers' },
      { label: 'Account Groups', href: '/masters/groups' },
      { label: 'Customers', href: '/masters/customers' },
      { label: 'Suppliers', href: '/masters/suppliers' },
    ] },

    // Performance & Oversight — branchwise analytics (never blended).
    { label: 'Performance & Oversight', icon: BarChart2, children: [
      { label: 'Branch Scorecard', href: '/tk/scorecard' },
      { label: 'Performance vs Target', href: '/tk/performance' },
      { label: 'Investment & Capital', href: '/tk/investment' },
      { label: 'Assets Central', href: '/tk/assets' },
      { label: 'Profitability', href: '/tk/profitability' },
      { label: 'Receivables & Payables', href: '/tk/receivables-payables' },
      { label: 'Exceptions & Risk', href: '/tk/exceptions' },
      { label: 'Compliance & Close', href: '/tk/compliance' },
      { label: 'Central Tax Desk', href: '/tk/tax-desk' },
    ] },

    // HR Control — governance + the HR screens.
    { label: 'HR Control', icon: Users, children: [
      { label: 'HR Requests', href: '/tk/hr-control' },
      { divider: true, label: 'HR screens' },
      { label: 'Employees', href: '/hr/employees' },
      { label: 'Payroll', href: '/hr/payroll' },
      { label: 'Attrition', href: '/hr/attrition' },
      { label: 'Recruitment', href: '/hr/recruitment' },
    ] },

    // Monitoring — live drill-downs.
    { label: 'Monitoring', icon: Activity, children: [
      { label: 'Branch Cockpit', href: '/tk/branch-cockpit' },
      { label: 'Audit Trail', href: '/tk/audit' },
    ] },

    // Setup & Roles — readiness, the go-live switch, and who does what.
    { label: 'Setup & Roles', icon: Rocket, children: [
      { label: 'Configuration Readiness', href: '/tk/readiness' },
      { label: 'Go-Live', href: '/tk/go-live' },
      { label: 'My Role', href: '/tk/my-role' },
      { label: 'Roles & Responsibilities', href: '/tk/roles' },
    ] },
  ];
}

// Routes reachable inside TK Group Central: the /tk control pages, the oversight
// dashboards and master/HR governance screens surfaced in the cockpit, PLUS the cross-
// cutting pages the app bar / user menu offer everywhere (personal profile & prefs
// under /settings, and Support). Only branch-OPERATIONAL pages (data-entry, branch
// books/registers, tax) are out of the control mode and bounce back to Control Tower.
const COCKPIT_PREFIXES = ['/tk/', '/dashboards/', '/masters/', '/hr/', '/settings/', '/support/'];
export function isCockpitRoute(route) {
  return !!route && (route === '/dashboard' || COCKPIT_PREFIXES.some((p) => route.startsWith(p)));
}
