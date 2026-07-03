/* The Accounts Tree View's top-level "Parent Group" rows are ONLY the 16 primary
   Tally groups (system, no parent). The 13 seeded system SUB-groups (Reserves &
   Surplus, Bank Accounts, Duties & Taxes, …) carry a parent and must render nested
   as a "Group" — never ALSO as a second top-level Parent Group. Regression guard
   for the double-render bug in modules/chartBuilder.jsx (isRootGroup). */

jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { isRootGroup } from '../modules/chartBuilder.jsx';

describe('Accounts Tree View — tree roots are top-level primaries only', () => {
  test('a system group with no parent IS a root (Parent Group)', () => {
    expect(isRootGroup({ name: 'Capital Account', system: true, parent: '' })).toBe(true);
    expect(isRootGroup({ name: 'Current Assets', system: true })).toBe(true);
  });

  test('a system SUB-group (has a parent) is NOT a root — renders nested only', () => {
    expect(isRootGroup({ name: 'Reserves & Surplus', system: true, parent: 'Capital Account' })).toBe(false);
    expect(isRootGroup({ name: 'Bank Accounts', system: true, parent: 'Current Assets' })).toBe(false);
    expect(isRootGroup({ name: 'Duties & Taxes', system: true, parent: 'Current Liabilities' })).toBe(false);
  });

  test('a custom (non-system) group is never a root', () => {
    expect(isRootGroup({ name: 'Supplier Air Lines', system: false, parent: 'Sundry Creditors' })).toBe(false);
    expect(isRootGroup({ name: 'Orphan', system: false, parent: '' })).toBe(false);
  });

  test('exactly the 16 primaries survive the filter over the full 29 system set', () => {
    const systemGroups = [
      // 16 primaries (parent null)
      ...['Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Fixed Assets', 'Investments',
        'Current Assets', 'Sales Accounts', 'Direct Income', 'Purchase Accounts', 'Direct Expenses',
        'Indirect Expenses', 'Indirect Income', 'Opening Stock', 'Closing Stock', 'Misc. Expenses (Asset)',
        'Suspense Account'].map((name) => ({ name, system: true, parent: null })),
      // 13 seeded sub-groups (parent set)
      ...['Reserves & Surplus', 'Bank OD Accounts', 'Secured Loans', 'Unsecured Loans', 'Duties & Taxes',
        'Provisions', 'Sundry Creditors', 'Bank Accounts', 'Cash-in-Hand', 'Deposits (Asset)',
        'Loans & Advances (Asset)', 'Stock-in-Hand', 'Sundry Debtors'].map((name) => ({ name, system: true, parent: 'X' })),
    ];
    expect(systemGroups.filter(isRootGroup)).toHaveLength(16);
  });

  test('null / undefined is safe', () => {
    expect(isRootGroup(undefined)).toBe(false);
    expect(isRootGroup(null)).toBe(false);
  });
});
