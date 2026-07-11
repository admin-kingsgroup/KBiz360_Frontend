/* The Accounts Tree "Move to…" / "Clone…" dialogs pick a target parent from an
   indented, tree-ordered option list. For MOVE the list must exclude the moved
   node AND its whole subtree (client-side cycle guard — the backend re-checks
   and 409s). Guards modules/masters/chartBuilder.jsx flattenParentOptions. */

jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { flattenParentOptions } from '../modules/masters/chartBuilder.jsx';

const CHART = [
  { id: '1', name: 'Indirect Expenses', parent: '', system: true },
  { id: '2', name: 'Office', parent: 'Indirect Expenses', system: false },
  { id: '3', name: 'Utilities', parent: 'Office', system: false },
  { id: '4', name: 'Travel', parent: 'Indirect Expenses', system: false },
  { id: '5', name: 'Sales Accounts', parent: '', system: true },
];

describe('Accounts Tree — Move/Clone parent picker options', () => {
  test('tree order with depth indent levels (Parent Group ▸ Group ▸ Sub-Group)', () => {
    const opts = flattenParentOptions(CHART);
    expect(opts.map((o) => o.name)).toEqual(['Indirect Expenses', 'Office', 'Utilities', 'Travel', 'Sales Accounts']);
    expect(opts.map((o) => o.depth)).toEqual([0, 1, 2, 1, 0]);
  });

  test('MOVE excludes the node AND its whole subtree (cycle guard)', () => {
    const opts = flattenParentOptions(CHART, 'Office');
    const names = opts.map((o) => o.name);
    expect(names).not.toContain('Office');
    expect(names).not.toContain('Utilities');          // descendant can never host its ancestor
    expect(names).toEqual(['Indirect Expenses', 'Travel', 'Sales Accounts']);
  });

  test('system nodes stay pickable as TARGETS (nesting under a fixed group is normal)', () => {
    const opts = flattenParentOptions(CHART, 'Travel');
    expect(opts.find((o) => o.name === 'Indirect Expenses').system).toBe(true);
  });

  test('empty / missing chart → no options (dialog stays disabled)', () => {
    expect(flattenParentOptions([])).toEqual([]);
    expect(flattenParentOptions(undefined)).toEqual([]);
  });
});
