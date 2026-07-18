/**
 * Public surface of the `dashboard` feature.
 *
 * The legacy names (`Dashboard`, `DirectorDashboard`, …) are preserved exactly
 * so `core/helpers.jsx::DashboardRouter` and `src/App.jsx` keep importing the
 * same identifiers and signatures they used before the refactor — this barrel
 * is the only thing that must not change shape.
 *
 * New code should prefer the explicit *Page exports or import from the route
 * registry, e.g. `import { dashboardRoutes } from 'modules/dashboard/routes'`.
 */

export { BranchDashboardPage as Dashboard, BranchDashboardPage } from './pages/branch-dashboard';
export { DirectorDashboardPage as DirectorDashboard, DirectorDashboardPage } from './pages/director-dashboard';
export { OwnerDashboardPage as OwnerDashboard, OwnerDashboardPage } from './pages/owner-dashboard';
export { AdCockpitPage as AdCockpit, AdCockpitPage } from './pages/ad-cockpit';
// Owner Cockpit — one destination wrapping Owner Dashboard (Overview) + AD Cockpit (Cockpit).
export { OwnerCockpitPage as OwnerCockpit, OwnerCockpitPage } from './pages/owner-cockpit';
// Governance & Exceptions — one destination wrapping Approvals & Audit + Alerts.
export { GovernanceBoard } from './pages/governance';
export { SrFmDashboardPage as SrFmDashboard, SrFmDashboardPage } from './pages/sr-fm-dashboard';
export { SrAeDashboardPage as SrAeDashboard, SrAeDashboardPage } from './pages/sr-ae-dashboard';
export { AcctsExecDashboardPage as AcctsExecDashboard, AcctsExecDashboardPage } from './pages/accts-exec-dashboard';
export { HrMgrDashboardPage as HrMgrDashboard, HrMgrDashboardPage } from './pages/hr-mgr-dashboard';
export { AlertsDashboard } from './pages/alerts-dashboard';
export { ReceivablesAgeingSettlementPage, PayablesAgeingSettlementPage } from './pages/ar-ap-ageing-settlement';

export { dashboardRoutes } from './routes';
export { useDashboardStore } from './store/dashboard.store';
