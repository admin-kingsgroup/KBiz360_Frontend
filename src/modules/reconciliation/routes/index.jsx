import React from 'react';

// ─── Reconciliation module · route table ─────────────────────────────────────
// Declarative (migrated) routes consumed by App.jsx's MIGRATED_FEATURE_ROUTES.
// Each Element receives { branch, setRoute, currentUser } from the router.
// THREE per-tier page families, each tier-locked (the menu is the tier switch):
//   • Reconciliation Hub  ▸ /reconciliation/hub/<tier>      — full-view dashboard
//   • Certification       ▸ /reconciliation/<tier>          — the sign-off register
//   • Reports             ▸ /reconciliation/reports/<tier>  — the tier's report
// The legacy combined paths (/reconciliation, /reconciliation/reports) keep
// working — they land on the weekly tier so no bookmark breaks.

const lazyEl = (loader, name) => React.lazy(() => loader().then((m) => ({ default: m[name] })));

const Hub = lazyEl(() => import('../index'), 'ReconciliationHub');
const Cert = lazyEl(() => import('../index'), 'CertificationRegister');
const Reports = lazyEl(() => import('../index'), 'ReconReportsPage');
const tierEl = (Comp, tier) => function TierRoute(props) { return <Comp {...props} tier={tier} />; };

export const reconciliationRoutes = [
  // Reconciliation Hub — full-view dashboard, one page per tier.
  { path: '/reconciliation/hub/daily', title: 'Daily Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'daily') },
  { path: '/reconciliation/hub/weekly', title: 'Weekly Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'weekly') },
  { path: '/reconciliation/hub/monthly', title: 'Monthly Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'month') },
  { path: '/reconciliation/hub/quarterly', title: 'Quarterly Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'quarter') },
  { path: '/reconciliation/hub/yearly', title: 'Yearly Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'year') },
  { path: '/reconciliation/hub', title: 'Weekly Reconciliation', moduleName: 'Reconciliation', Element: tierEl(Hub, 'weekly') },
  // Register — one page per tier (Daily/Weekly = freeze & approve at branch;
  // Month/Quarter/Year = certification at TK Group). Same component, tier-gated.
  { path: '/reconciliation/daily', title: 'Daily Freeze', moduleName: 'Reconciliation', Element: tierEl(Cert, 'daily') },
  { path: '/reconciliation/weekly', title: 'Weekly Freeze', moduleName: 'Reconciliation', Element: tierEl(Cert, 'weekly') },
  { path: '/reconciliation/monthly', title: 'Monthly Certification', moduleName: 'Reconciliation', Element: tierEl(Cert, 'month') },
  { path: '/reconciliation/quarterly', title: 'Quarterly Certification', moduleName: 'Reconciliation', Element: tierEl(Cert, 'quarter') },
  { path: '/reconciliation/yearly', title: 'Yearly Certification', moduleName: 'Reconciliation', Element: tierEl(Cert, 'year') },
  // Reports — one report per tier (titles match the menu entries exactly).
  { path: '/reconciliation/reports/daily', title: 'Daily Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'daily') },
  { path: '/reconciliation/reports/weekly', title: 'Weekly Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'weekly') },
  { path: '/reconciliation/reports/monthly', title: 'Monthly Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'month') },
  { path: '/reconciliation/reports/quarterly', title: 'Quarterly Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'quarter') },
  { path: '/reconciliation/reports/yearly', title: 'Yearly Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'year') },
  // Legacy combined paths → weekly (old bookmarks keep working — the pill still
  // lands on Weekly Certification, unchanged).
  { path: '/reconciliation', title: 'Weekly Certification', moduleName: 'Reconciliation', Element: tierEl(Cert, 'weekly') },
  { path: '/reconciliation/reports', title: 'Weekly Report', moduleName: 'Reconciliation', Element: tierEl(Reports, 'weekly') },
  // TK Group Central — per-branch approval inbox (frozen certs awaiting a signature).
  { path: '/reconciliation/inbox', title: 'Approval Inbox', moduleName: 'Reconciliation', Element: lazyEl(() => import('../index'), 'ApprovalInbox') },
  // Governance + guide.
  { path: '/reconciliation/rulebook', title: 'Reconciliation Rule Book', moduleName: 'Reconciliation', Element: lazyEl(() => import('../index'), 'RuleBookPage') },
  { path: '/reconciliation/match-guide', title: 'Statement Match Guide', moduleName: 'Reconciliation', Element: lazyEl(() => import('../index'), 'MatchGuidePage') },
];
