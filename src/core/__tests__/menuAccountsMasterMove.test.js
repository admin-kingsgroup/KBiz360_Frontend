import { MENU_ACCOUNTS, MENU_MASTERS } from '../menus';

// "Accounts Master" (Chart of Accounts, Cost Centres, Budgets, Scenarios) was
// moved from the standalone Masters pill into the Accounts header.
// Consolidated to 3 Tally-style doors: Groups, Ledgers, Chart of Accounts (tree).
// The old separate "/masters/subgroups" menu item was folded into the Groups door
// (groups & sub-groups are one collection), so it no longer appears in the menu.
const ACCOUNTS_MASTER_HREFS = [
  '/masters/groups', '/masters/ledgers', '/masters/accounts-tree',
  '/masters/bank-accounts', '/masters/cost-categories', '/masters/cost-centers',
  '/masters/budgets', '/masters/scenarios',
];

const section = (menu, label) => (menu.children || []).find((c) => c.label === label);
const hrefs = (node, out = []) => {
  if (!node) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => hrefs(c, out));
  return out;
};

describe('Accounts Master moved into the Accounts header', () => {
  it('exists as an "Accounts Master" section under the Accounts pill', () => {
    const sec = section(MENU_ACCOUNTS, 'Accounts Master');
    expect(sec).toBeTruthy();
    const got = new Set(hrefs(sec));
    ACCOUNTS_MASTER_HREFS.forEach((h) => expect(got.has(h)).toBe(true));
  });

  it('no longer lives under the Masters pill', () => {
    expect(section(MENU_MASTERS, 'Accounts Master')).toBeUndefined();
    // the chart-of-accounts routes are gone from the Masters pill entirely
    const mastersHrefs = new Set(hrefs(MENU_MASTERS));
    ['/masters/accounts-tree', '/masters/groups', '/masters/subgroups', '/masters/ledgers']
      .forEach((h) => expect(mastersHrefs.has(h)).toBe(false));
  });

  it('drops the old "Masters (quick create)" subset from Accounts', () => {
    expect(section(MENU_ACCOUNTS, 'Masters (quick create)')).toBeUndefined();
  });

  it('Masters pill still keeps its other sections (Voucher / Client / Supplier)', () => {
    ['Voucher Master', 'Client Master', 'Supplier Master'].forEach((l) =>
      expect(section(MENU_MASTERS, l)).toBeTruthy());
  });

  it('Currencies & Forex Rates moved into Accounts Master, out of the Masters pill', () => {
    const accMaster = new Set(hrefs(section(MENU_ACCOUNTS, 'Accounts Master')));
    expect(accMaster.has('/masters/currency')).toBe(true);
    expect(accMaster.has('/masters/forex')).toBe(true);
    const mastersHrefs = new Set(hrefs(MENU_MASTERS));
    expect(mastersHrefs.has('/masters/currency')).toBe(false);
    expect(mastersHrefs.has('/masters/forex')).toBe(false);
    // the section is renamed Tax Master and still has the tax codes
    expect(section(MENU_MASTERS, 'Tax Master')).toBeTruthy();
    expect(mastersHrefs.has('/masters/tax')).toBe(true);
  });
});
