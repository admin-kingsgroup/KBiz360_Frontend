// CONSOLIDATION (2026-07): the owner's "Dashboards" dropdown was rationalised from 23
// standalone boards down to 12, with no loss of function:
//   • Owner Cockpit unifies AD Dashboard (All) + AD Cockpit (two in-page views)
//   • Performance (TGT VS Sales/GP/Coll/EX/NP) folds in the 4 Targets boards as tiles/drill-downs
//   • Profitability (P&L) folds in YoY Growth + Expenses as tabs
//   • Cash & Liquidity folds in the 13-week Cash Forecast as a tab
//   • Sales & GP folds in Module/Product GP; Customers & Suppliers folds in Supplier/Purchase
//   • Governance & Exceptions unifies Approvals & Audit + Alerts (two tabs)
// Every retired board's /dashboards/* route stays alive as a tab target / deep-link.
// This test pins the count + the exact set so the sprawl can't creep back.
import { getMenu } from '../menus';
import { ALWAYS_VISIBLE } from '../pageCatalog';

const OWNER = { role: 'Super Admin', email: 'afshin.dhanani@kingsgroupco.com' };

const dashboardsPill = (user) => getMenu('ALL', user).find((m) => m && m.label === 'Dashboards');
const leafHrefs = (node, out = []) => {
  if (!node || node.divider) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => leafHrefs(c, out));
  return out;
};

describe('Owner Dashboards dropdown — consolidated to 12', () => {
  const hrefs = leafHrefs(dashboardsPill(OWNER));

  test('the owner sees exactly 12 dashboard destinations, none duplicated', () => {
    expect(hrefs).toHaveLength(12);
    expect(new Set(hrefs).size).toBe(12);
  });

  test('every folded tab-target route is ALWAYS_VISIBLE (a stale hidden entry can never strand a tab)', () => {
    // These routes are no longer menu entries — they are reached only via a parent board's
    // in-page tab/drill. If one were on a user's pre-consolidation deny-list, the hidden guard
    // would strand the tab on "Page not available" with no catalogue row to restore it. Keeping
    // them ALWAYS_VISIBLE (and having App.jsx's hidden guard honour that set) prevents this.
    const foldedTabTargets = [
      '/dashboard/cockpit', '/dashboard/alerts',
      '/dashboards/yoy', '/dashboards/expenses', '/dashboards/cash-forecast',
      '/dashboards/module-gp', '/dashboards/supplier',
      '/dashboards/sales-target', '/dashboards/gp-target', '/dashboards/collections-target', '/dashboards/budget-expense',
    ];
    foldedTabTargets.forEach((r) => expect(ALWAYS_VISIBLE.has(r)).toBe(true));
  });

  test('the 12 are exactly the expected consolidated boards', () => {
    expect(new Set(hrefs)).toEqual(new Set([
      '/dashboard/owner',           // 1  Owner Cockpit (Overview + Cockpit views)
      '/dashboards/capital',        // 2  Capital vs Investment
      '/dashboards/performance',    // 3  TGT VS Sales/GP/Coll/EX/NP (4 Targets folded in)
      '/dashboards/profitability',  // 4  Profitability P&L (YoY + Expenses tabs)
      '/dashboards/balance-sheet',  // 5  Balance Sheet
      '/dashboards/cash',           // 6  Cash & Liquidity (Cash Forecast tab)
      '/dashboards/arap',           // 7  Receivables & Payables
      '/dashboards/tax',            // 8  Tax & Compliance
      '/dashboards/sales',          // 9  Sales & GP (Module GP tab)
      '/dashboards/customer-value', // 10 Customers & Suppliers (Supplier tab)
      '/dashboards/branch',         // 11 Branch & Group Performance
      '/dashboards/audit',          // 12 Governance & Exceptions (Alerts tab)
    ]));
  });
});
