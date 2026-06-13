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
export { SrFmDashboardPage as SrFmDashboard, SrFmDashboardPage } from './pages/sr-fm-dashboard';
export { SrAeDashboardPage as SrAeDashboard, SrAeDashboardPage } from './pages/sr-ae-dashboard';
export { AcctsExecDashboardPage as AcctsExecDashboard, AcctsExecDashboardPage } from './pages/accts-exec-dashboard';
export { HrMgrDashboardPage as HrMgrDashboard, HrMgrDashboardPage } from './pages/hr-mgr-dashboard';
export { AlertsDashboard } from './pages/alerts-dashboard';

export { dashboardRoutes } from './routes';
export { useDashboardStore } from './store/dashboard.store';
