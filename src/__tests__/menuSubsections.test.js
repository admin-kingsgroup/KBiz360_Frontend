/* Verifies the long, flat menu groups were broken into labelled sub-sections
   (gold "sub-row" dividers) the same way the Accounts pill already is — without
   losing or duplicating any route. */
import { MENU_REPORTS, MENU_HR, MENU_SETTINGS, MENU_FINANCE, MENU_MASTERS, MENU_DASHBOARDS } from '../core/menus';

const groupByLabel = (pill, label) => pill.children.find((c) => c.label === label);
const dividerLabels = (g) => (g.children || []).filter((c) => c.divider).map((c) => c.label);
const leafHrefs = (g) => (g.children || []).filter((c) => !c.divider && c.href).map((c) => c.href);

// pill, group label, expected sub-section dividers, expected leaf-route count
const CASES = [
  [MENU_REPORTS,    'Profitability & GP',             ['Gross Profit', 'Yield', 'Customer & Product', 'Comparative & Group'], 11],
  [MENU_HR,         'Self-Service',                   ['Portal', 'Requests', 'Pay & Tax', 'Performance'],                     9],
  [MENU_SETTINGS,   'Admin Power',                    ['Templates & Branding', 'Approvals & Access', 'Data & Users'],         8],
  [MENU_DASHBOARDS, 'Financials',                     ['P&L & Growth', 'Balance & Cash', 'Working Capital & Tax'],            8],
  [MENU_FINANCE,    'Period-End, Targets & Accruals', ['Period-End', 'Targets & Budgets', 'Registers'],                       6],
  [MENU_MASTERS,    'Inventory & Catalog Master',     ['Travel Inventory', 'Codes & Rates'],                                  6],
];

describe('long menu groups are organized into sub-sections', () => {
  test.each(CASES)('%#: %s ▸ %s has the expected sub-headers', (pill, label, dividers) => {
    const g = groupByLabel(pill, label);
    expect(g).toBeTruthy();
    expect(dividerLabels(g)).toEqual(dividers);
  });

  test.each(CASES)('%#: %s ▸ %s keeps all routes, none duplicated', (pill, label, _d, count) => {
    const hrefs = leafHrefs(groupByLabel(pill, label));
    expect(hrefs).toHaveLength(count);
    expect(new Set(hrefs).size).toBe(count); // no duplicates
  });
});
