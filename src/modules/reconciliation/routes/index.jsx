import React from 'react';

// ─── Reconciliation module · route table ─────────────────────────────────────
// Declarative (migrated) routes consumed by App.jsx's MIGRATED_FEATURE_ROUTES.
// Each Element receives { branch, setRoute, currentUser } from the router.

const lazyEl = (loader, name) => React.lazy(() => loader().then((m) => ({ default: m[name] })));

export const reconciliationRoutes = [
  { path: '/reconciliation', title: 'Reconciliation', moduleName: 'Reconciliation', Element: lazyEl(() => import('../index'), 'ReconciliationHub') },
  { path: '/reconciliation/reports', title: 'Reconciliation Reports & Pending', moduleName: 'Reconciliation', Element: lazyEl(() => import('../index'), 'ReconReportsPage') },
  { path: '/reconciliation/rulebook', title: 'Reconciliation Rule Book', moduleName: 'Reconciliation', Element: lazyEl(() => import('../index'), 'RuleBookPage') },
];
