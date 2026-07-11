import React from 'react';

// ─── Tally Reconciliation module · route table ───────────────────────────────
// The whole-books ERP↔Tally tie-out board, one page per tier (the menu is the
// tier switch). Spread into App.jsx's MIGRATED_FEATURE_ROUTES. The legacy bare
// path lands on the monthly board so bookmarks are safe.

const lazyEl = (loader, name) => React.lazy(() => loader().then((m) => ({ default: m[name] })));
const Board = lazyEl(() => import('../index'), 'TallyTieOutBoard');
const Guide = lazyEl(() => import('../index'), 'TallyGuidePage');
const tierEl = (Comp, tier) => function TierRoute(props) { return <Comp {...props} tier={tier} />; };

export const tallyReconRoutes = [
  { path: '/tally-reconciliation/monthly', title: 'Monthly Tie-Out', moduleName: 'Tally Reconciliation', Element: tierEl(Board, 'month') },
  { path: '/tally-reconciliation/yearly', title: 'Yearly Tie-Out', moduleName: 'Tally Reconciliation', Element: tierEl(Board, 'year') },
  { path: '/tally-reconciliation/guide', title: 'Tally Reconciliation Guide', moduleName: 'Tally Reconciliation', Element: Guide },
  { path: '/tally-reconciliation', title: 'Monthly Tie-Out', moduleName: 'Tally Reconciliation', Element: tierEl(Board, 'month') },
];
