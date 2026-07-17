// ───────────────────────────────────────────────────────────────────────────
// Route → breadcrumb derivation. Walks the static menu trees once at module
// load and builds a map of href → ["Section", "Sub-section", "Leaf"] so the
// shell ContextBar can render a breadcrumb on EVERY screen without each screen
// declaring one. Dynamic/unlisted routes fall back to a humanized path.
// ───────────────────────────────────────────────────────────────────────────
import {
  MENU_MASTERS, MENU_FINANCE, MENU_REPORTS, MENU_HR, MENU_SETTINGS, MENU_ASSETS,
  MENU_ACCOUNTS, MENU_DASHBOARDS, MENU_IMPORT_EXPORT, MENU_APPROVALS, MENU_RECONCILIATION, MENU_TALLY_RECON,
} from './menus';
import { TAX_ALL, TAX_INDIA, TAX_AFRICA } from './data';

// MENU_ACCOUNTS is listed first so the account reports that now live ONLY under
// the Accounts pill (P&L, BS, registers, ageing, audit trail…) get an
// "Accounts ▸ …" breadcrumb instead of falling back to a humanized path.
const ROOTS = [
  MENU_ACCOUNTS, MENU_RECONCILIATION, MENU_TALLY_RECON, MENU_DASHBOARDS, MENU_FINANCE, MENU_REPORTS, MENU_MASTERS, MENU_HR, MENU_SETTINGS,
  MENU_ASSETS, MENU_IMPORT_EXPORT, MENU_APPROVALS,
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
  '/dashboard/owner': ['Dashboards', 'AD Dashboard (All)'],
  '/ledger': ['Finance', 'Books', 'Ledger Account'],
  '/day-book': ['Finance', 'Books', 'Day Book'],
  '/finance/cash-book': ['Finance', 'Books', 'Cash Book'],
  '/trial-balance': ['Finance', 'Books', 'Trial Balance'],
  '/bank-reco': ['Accounts', 'Reconciliation', 'Bank Reconciliation'],
  '/accounts/client-reco': ['Accounts', 'Reconciliation', 'Client Reconciliation'],
  '/accounts/supplier-reco': ['Accounts', 'Reconciliation', 'Supplier Reconciliation'],
  '/accounts/interbranch-reco': ['Accounts', 'Reconciliation', 'Inter-branch Reconciliation'],
  '/accounts/inb-register': ['Accounts', 'Reconciliation', 'Inter-Branch Register'],
  '/accounts/inb-counterparty': ['Accounts', 'Inter Branch', 'Counterparty Ledger'],
  '/inb/outgoing': ['Finance', 'Inter Branch', 'Outgoing · We Sell'],
  '/inb/incoming': ['Finance', 'Inter Branch', 'Incoming · Convert'],
  '/transactions/inb-approvals': ['Finance', 'Inter Branch', 'Outgoing · We Sell'],  // legacy alias
  '/accounts/inb-inbound': ['Finance', 'Inter Branch', 'Incoming · Convert'],        // legacy alias
  '/transactions/approvals/receipt': ['Finance', 'Approvals', 'Receipt'],
  '/transactions/approvals/payment': ['Finance', 'Approvals', 'Payment'],
  '/transactions/approvals/contra': ['Finance', 'Approvals', 'Contra'],
  '/transactions/approvals/journal': ['Finance', 'Approvals', 'Journal'],
  '/transactions/approvals/purchase-expense': ['Finance', 'Approvals', 'Purchase Expense'],
  '/transactions/approvals/debit-note': ['Finance', 'Approvals', 'Debit Note'],
  '/transactions/approvals/adm': ['Finance', 'Approvals', 'ADM'],
  '/transactions/approvals/acm': ['Finance', 'Approvals', 'ACM'],
  '/finance/reco-queue': ['Accounts', 'Reconciliation', 'Reconciliation Queue'],
  '/reconciliation/inbox': ['Statement Reconciliation', 'Approvals — Daily & Weekly', 'Approval Inbox'],
  // Month/Quarter/Year reconciliation is CERTIFIED at TK Group Central (cockpit),
  // so these pages are not on the static branch menu — give them stable crumbs here.
  '/reconciliation/monthly': ['Statement Reconciliation', 'Certification', 'Monthly Certification'],
  '/reconciliation/quarterly': ['Statement Reconciliation', 'Certification', 'Quarterly Certification'],
  '/reconciliation/yearly': ['Statement Reconciliation', 'Certification', 'Yearly Certification'],
  '/reconciliation/hub/monthly': ['Statement Reconciliation', 'Reconciliation Hub', 'Monthly Reconciliation'],
  '/reconciliation/hub/quarterly': ['Statement Reconciliation', 'Reconciliation Hub', 'Quarterly Reconciliation'],
  '/reconciliation/hub/yearly': ['Statement Reconciliation', 'Reconciliation Hub', 'Yearly Reconciliation'],
  '/reconciliation/reports/monthly': ['Statement Reconciliation', 'Reports', 'Monthly Report'],
  '/reconciliation/reports/quarterly': ['Statement Reconciliation', 'Reports', 'Quarterly Report'],
  '/reconciliation/reports/yearly': ['Statement Reconciliation', 'Reports', 'Yearly Report'],
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
