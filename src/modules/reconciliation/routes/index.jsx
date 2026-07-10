import React from 'react';

// ─── Reconciliation module · route table ─────────────────────────────────────
// Declarative (migrated) routes consumed by App.jsx's MIGRATED_FEATURE_ROUTES.
// Each Element receives { branch, setRoute, currentUser } from the router.
// The TIER is part of the route: Reconcile & Certify ▸ /reconciliation/<tier>
// and Reports ▸ /reconciliation/reports/<tier> render the same two pages
// tier-locked (the menu is the tier switch). The legacy combined paths
// (/reconciliation, /reconciliation/reports) keep working — they land on the
// weekly tier so no bookmark breaks.

const lazyEl = (loader, name) => React.lazy(() => loader().then((m) => ({ default: m[name] })));

const Hub = lazyEl(() => import('../index'), 'ReconciliationHub');
const Reports = lazyEl(() => import('../index'), 'ReconReportsPage');
const tierEl = (Comp, tier) => function TierRoute(props) { return <Comp {...props} tier={tier} />; };

export const reconciliationRoutes = [
  // Reconcile & Certify — one page per tier.
  { path: '/reconciliation/weekly', title: 'Weekly Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'weekly') },
  { path: '/reconciliation/monthly', title: 'Monthly Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'month') },
  { path: '/reconciliation/quarterly', title: 'Quarterly Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'quarter') },
  { path: '/reconciliation/yearly', title: 'Yearly Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'year') },
  // Reports — one report per tier.
  { path: '/reconciliation/reports/weekly', title: 'Weekly Reconciliation Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'weekly') },
  { path: '/reconciliation/reports/monthly', title: 'Monthly Reconciliation Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'month') },
  { path: '/reconciliation/reports/quarterly', title: 'Quarterly Reconciliation Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'quarter') },
  { path: '/reconciliation/reports/yearly', title: 'Yearly Reconciliation Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'year') },
  // Legacy combined paths → weekly (old bookmarks keep working).
  { path: '/reconciliation', title: 'Weekly Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'weekly') },
  { path: '/reconciliation/reports', title: 'Weekly Reconciliation Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'weekly') },
  // Governance + guide.
  { path: '/reconciliation/rulebook', title: 'Reconciliation Rule Book', moduleName: 'Reconciliation', Element: lazyEl(() => import('../index'), 'RuleBookPage') },
  { path: '/reconciliation/match-guide', title: 'Statement Match Guide', moduleName: 'Reconciliation', Element: lazyEl(() => import('../index'), 'MatchGuidePage') },
];
