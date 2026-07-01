import React from 'react';

/**
 * Declarative route table for the Support (issue-tracker) feature — the same
 * forward-compatible shape App.jsx already mounts for finance. The page Element is
 * lazy() so the feature code stays out of the initial bundle (App renders migrated
 * routes inside a <Suspense> boundary). Add more rows here as the feature grows.
 */
const lazyEl = (loader, name) =>
  React.lazy(() => loader().then((m) => ({ default: m[name] })));

export const supportRoutes = [
  { path: '/support/tickets', title: 'Support Tickets', moduleName: 'Support', Element: lazyEl(() => import('../pages/support-tickets'), 'SupportTicketsPage') },
];
