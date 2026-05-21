import { BranchDashboardPage } from '../pages/branch-dashboard';
import { DirectorDashboardPage } from '../pages/director-dashboard';
import { SrFmDashboardPage } from '../pages/sr-fm-dashboard';
import { SrAeDashboardPage } from '../pages/sr-ae-dashboard';
import { AcctsExecDashboardPage } from '../pages/accts-exec-dashboard';
import { HrMgrDashboardPage } from '../pages/hr-mgr-dashboard';

/**
 * Declarative route table for the dashboard feature.
 *
 * Today the host app uses a custom string-router in `src/App.jsx` plus a
 * `DashboardRouter` helper that picks the right role view. Until that
 * migrates to `react-router-dom`, this array is consumed as documentation
 * and as a forward-compatible config.
 *
 * Lazy loading: pages are imported statically here because the barrel
 * (`../index.js`) must re-export them eagerly to satisfy the legacy
 * `core/helpers.jsx` contract. When the host adopts `react-router-dom`,
 * move the lazy() wrapping into App.jsx with a top-level <Suspense> and
 * drop the barrel's role-name re-exports — Vite will then code-split each
 * page into its own chunk.
 */
export const dashboardRoutes = [
  { path: '/dashboard',              title: 'Dashboard',                            moduleName: null,        Element: BranchDashboardPage },
  { path: '/dashboard/director',     title: 'Director Dashboard',                   moduleName: 'Director',  Element: DirectorDashboardPage },
  { path: '/dashboard/sr-fm',        title: 'Senior Finance Manager Dashboard',     moduleName: 'Finance',   Element: SrFmDashboardPage },
  { path: '/dashboard/sr-ae',        title: 'Senior Accounts Executive Dashboard',  moduleName: 'Accounts',  Element: SrAeDashboardPage },
  { path: '/dashboard/accts-exec',   title: 'Accounts Executive Dashboard',         moduleName: 'Accounts',  Element: AcctsExecDashboardPage },
  { path: '/dashboard/hr-mgr',       title: 'HR Manager Dashboard',                 moduleName: 'HR',        Element: HrMgrDashboardPage },
];
