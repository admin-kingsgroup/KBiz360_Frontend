/* The Accounts Tree View "Count" column rolls a group node's entry counts up from
   its whole subtree, counting each distinct ledger NAME once (a name that appears
   as several branch copies in the consolidated view is one accounting head, so it
   must not be double-counted). Guards modules/chartBuilder.jsx rollupEntries. */

jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { rollupEntries } from '../modules/chartBuilder.jsx';

// usage maps are keyed by LOWER-cased ledger name (as the API returns them).
const usage = { cash: 5, 'hdfc bank': 12, 'sgst input [bom]': 343 };

describe('Accounts Tree View — entry-count rollup', () => {
  test('sums the ledgers directly on a node', () => {
    const node = { ledgers: [{ name: 'Cash' }, { name: 'HDFC Bank' }], children: [] };
    expect(rollupEntries(node, usage)).toBe(17);
  });

  test('rolls up through nested children (subtree sum)', () => {
    const node = {
      ledgers: [{ name: 'Cash' }],
      children: [{ ledgers: [{ name: 'HDFC Bank' }], children: [{ ledgers: [{ name: 'SGST Input [BOM]' }], children: [] }] }],
    };
    expect(rollupEntries(node, usage)).toBe(5 + 12 + 343);
  });

  test('counts a duplicated name (branch copies) only ONCE', () => {
    const node = { ledgers: [{ name: 'Cash', branch: 'BOM' }, { name: 'cash', branch: 'NBO' }], children: [] };
    expect(rollupEntries(node, usage)).toBe(5); // not 10
  });

  test('name matching is case-insensitive; unknown ledgers contribute 0', () => {
    const node = { ledgers: [{ name: 'HDFC BANK' }, { name: 'Unposted Ledger' }], children: [] };
    expect(rollupEntries(node, usage)).toBe(12);
  });

  test('null node / missing usage are safe', () => {
    expect(rollupEntries(null, usage)).toBe(0);
    expect(rollupEntries({ ledgers: [{ name: 'Cash' }], children: [] })).toBe(0);
  });
});
