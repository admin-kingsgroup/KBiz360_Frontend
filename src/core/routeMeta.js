// ───────────────────────────────────────────────────────────────────────────
// Route → breadcrumb derivation. Walks the static menu trees once at module
// load and builds a map of href → ["Section", "Sub-section", "Leaf"] so the
// shell ContextBar can render a breadcrumb on EVERY screen without each screen
// declaring one. Dynamic/unlisted routes fall back to a humanized path.
// ───────────────────────────────────────────────────────────────────────────
import {
  MENU_MASTERS, MENU_FINANCE, MENU_REPORTS, MENU_HR, MENU_SETTINGS, MENU_ASSETS,
  MENU_HO_CONTROL, MENU_TRANSACTIONS, MENU_DASHBOARDS, MENU_IMPORT_EXPORT, MENU_APPROVALS,
} from './menus';
import { TAX_ALL, TAX_INDIA, TAX_AFRICA } from './data';

const ROOTS = [
  MENU_DASHBOARDS, MENU_FINANCE, MENU_REPORTS, MENU_MASTERS, MENU_HR, MENU_SETTINGS,
  MENU_ASSETS, MENU_HO_CONTROL, MENU_TRANSACTIONS, MENU_IMPORT_EXPORT, MENU_APPROVALS,
  TAX_ALL, TAX_INDIA, TAX_AFRICA,
].filter(Boolean);

const HREF_MAP = {};
function walk(node, trail) {
  if (!node || node.divider) return;
  const here = node.label ? [...trail, node.label] : trail;
  if (node.href && !HREF_MAP[node.href]) HREF_MAP[node.href] = here;
  (node.children || []).forEach((c) => walk(c, here));
}
ROOTS.forEach((r) => walk(r, []));

// A few high-traffic routes that live outside the menu tree (or under aliases).
const EXTRA = {
  '/dashboard': ['Dashboard'],
  '/ledger': ['Finance', 'Books', 'Ledger Account'],
  '/day-book': ['Finance', 'Books', 'Day Book'],
  '/finance/cash-book': ['Finance', 'Books', 'Cash Book'],
  '/trial-balance': ['Finance', 'Books', 'Trial Balance'],
  '/bank-reco': ['Accounts', 'Reconciliation', 'Bank Reconciliation'],
  '/accounts/supplier-reco': ['Accounts', 'Reconciliation', 'Supplier Reconciliation'],
  '/finance/reco-queue': ['Accounts', 'Reconciliation', 'Reconciliation Queue'],
  '/import': ['Admin', 'Import / Export', 'Data Import'],
  '/search': ['Search'],
};
Object.entries(EXTRA).forEach(([k, v]) => { if (!HREF_MAP[k]) HREF_MAP[k] = v; });

const titleCase = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Return an array of { label, href } crumb segments for a route. Intermediate
// segments carry no href (not directly navigable); the leaf is the current page.
export function crumbsFor(route) {
  if (!route) return [{ label: 'Dashboard', href: '/dashboard' }];
  const labels = HREF_MAP[route];
  if (labels) return labels.map((label, i) => ({ label, href: i === labels.length - 1 ? route : undefined }));
  // Fallback: humanize the path segments (e.g. /reports/foo-bar → Reports › Foo Bar)
  const segs = String(route).split('/').filter(Boolean);
  if (!segs.length) return [{ label: 'Dashboard', href: '/dashboard' }];
  return segs.map((s, i) => ({ label: titleCase(s), href: i === segs.length - 1 ? route : undefined }));
}

// Short label for a route (the leaf crumb) — used for recents/tab chips.
export function labelFor(route) {
  const c = crumbsFor(route);
  return c[c.length - 1]?.label || route;
}
