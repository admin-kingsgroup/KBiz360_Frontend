// CONSOLIDATION (2026-07): the owner's "Dashboards" dropdown was rationalised from 23
// standalone boards down to 12, with no loss of function:
//   • Owner Cockpit unifies AD Dashboard (All) + AD Cockpit (two in-page views)
//   • Performance (TGT VS Sales/GP/EX/NP) folds in the 4 Targets boards as tiles/drill-downs
//   • Profitability (P&L) folds in YoY Growth + Expenses as tabs
//   • Cash & Liquidity folds in the 13-week Cash Forecast as a tab
//   • Sales & GP folds in Module/Product GP; Customers & Suppliers folds in Supplier/Purchase
//   • Governance & Exceptions unifies Approvals & Audit + Alerts (two tabs)
// Every retired board's /dashboards/* route stays alive as a tab target / deep-link.
// This test pins the count + the exact set so the sprawl can't creep back.
import { getMenu } from '../menus';

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

  test('the 12 are exactly the expected consolidated boards', () => {
    expect(new Set(hrefs)).toEqual(new Set([
      '/dashboard/owner',           // 1  Owner Cockpit (Overview + Cockpit views)
      '/dashboards/capital',        // 2  Capital vs Investment
      '/dashboards/performance',    // 3  TGT VS Sales/GP/EX/NP (4 Targets folded in)
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
