import { MENU_ACCOUNTS, MENU_MASTERS } from '../menus';

// "Accounts Master" (Groups, Ledgers, Chart-of-Accounts tree, Bank Accounts,
// Currencies and the Cost dimensions) lives under the MASTERS pill. Only
// operational rate/planning data — daily Forex Rates plus Budgets & Scenarios —
// stays under the Accounts header, in a node renamed "Currency & Planning".
// Groups & sub-groups are one collection (3-tier tree) sharing the Groups door.
const ACCOUNTS_MASTER_HREFS = [
  '/masters/groups', '/masters/ledgers', '/masters/accounts-tree',
  '/masters/bank-accounts', '/masters/currency',
  '/masters/cost-categories', '/masters/cost-centers',
];
const CURRENCY_PLANNING_HREFS = ['/masters/forex', '/masters/budgets', '/masters/scenarios'];

const section = (menu, label) => (menu.children || []).find((c) => c.label === label);
const hrefs = (node, out = []) => {
  if (!node) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => hrefs(c, out));
  return out;
};

describe('Accounts Master lives under the Masters pill', () => {
  it('exists as an "Accounts Master" section under the Masters pill', () => {
    const sec = section(MENU_MASTERS, 'Accounts Master');
    expect(sec).toBeTruthy();
    const got = new Set(hrefs(sec));
    ACCOUNTS_MASTER_HREFS.forEach((h) => expect(got.has(h)).toBe(true));
  });

  it('the chart-of-accounts / cost / currency masters are gone from the Accounts pill', () => {
    const accHrefs = new Set(hrefs(MENU_ACCOUNTS));
    ACCOUNTS_MASTER_HREFS.forEach((h) => expect(accHrefs.has(h)).toBe(false));
    // the old "Accounts Master" node no longer exists under Accounts
    expect(section(MENU_ACCOUNTS, 'Accounts Master')).toBeUndefined();
  });

  it('Accounts keeps a "Currency & Planning" node with Forex / Budgets / Scenarios only', () => {
    const cp = section(MENU_ACCOUNTS, 'Currency & Planning');
    expect(cp).toBeTruthy();
    const got = new Set(hrefs(cp));
    CURRENCY_PLANNING_HREFS.forEach((h) => expect(got.has(h)).toBe(true));
    // these operational/planning routes did NOT move to Masters
    const mastersHrefs = new Set(hrefs(MENU_MASTERS));
    CURRENCY_PLANNING_HREFS.forEach((h) => expect(mastersHrefs.has(h)).toBe(false));
  });

  it('Masters pill still keeps its other sections (Voucher / Client / Supplier / Tax)', () => {
    ['Voucher Master', 'Client Master', 'Supplier Master', 'Tax Master'].forEach((l) =>
      expect(section(MENU_MASTERS, l)).toBeTruthy());
  });

  it('Currencies moved to Masters ▸ Accounts Master; daily Forex Rates stay in Accounts', () => {
    const accMaster = new Set(hrefs(section(MENU_MASTERS, 'Accounts Master')));
    expect(accMaster.has('/masters/currency')).toBe(true);
    expect(accMaster.has('/masters/forex')).toBe(false);
    const currencyPlanning = new Set(hrefs(section(MENU_ACCOUNTS, 'Currency & Planning')));
    expect(currencyPlanning.has('/masters/forex')).toBe(true);
    expect(currencyPlanning.has('/masters/currency')).toBe(false);
    // Tax codes still under the Tax Master section
    expect(new Set(hrefs(MENU_MASTERS)).has('/masters/tax')).toBe(true);
  });
});
