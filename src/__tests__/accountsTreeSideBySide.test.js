/* Side-by-Side view: a node that holds ledgers DIRECTLY (e.g. Capital Account →
   AD/ND Capital) must show its own ledgers in the Ledger column — it must NOT be
   auto-drilled into a child group (Reserves & Surplus) that would hide them. Only a
   node with no direct ledgers auto-drills to its first populated child. Guards
   chartBuilder.autoChildName. */

jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { autoChildName, sideLedgerList, DIRECT_LEDGERS } from '../modules/masters/chartBuilder.jsx';

const node = (name, ledgers = [], children = []) => ({ name, ledgers, children });

describe('autoChildName — Side-by-Side auto-drill', () => {
  test('a node WITH direct ledgers does not auto-drill (show its own ledgers)', () => {
    // Capital Account: 2 direct ledgers + an empty Reserves & Surplus child.
    const capital = node('Capital Account', [{ name: 'AD Capital' }, { name: 'ND Capital' }], [node('Reserves & Surplus')]);
    expect(autoChildName(capital)).toBe(''); // '' → the Ledger column shows AD/ND Capital
  });

  test('a node with NO direct ledgers drills to its first POPULATED child', () => {
    const cl = node('Current Liabilities', [], [
      node('Salary & Expenses Payable'),                          // empty
      node('Duties & Taxes', [], [node('Input GST', [{ name: 'x' }])]), // has children → populated
    ]);
    expect(autoChildName(cl)).toBe('Duties & Taxes');
  });

  test('no populated child → falls back to the first child', () => {
    const n = node('P', [], [node('A'), node('B')]);
    expect(autoChildName(n)).toBe('A');
  });

  test('a leaf group (no children, no ledgers) and null are safe', () => {
    expect(autoChildName(node('Empty'))).toBe('');
    expect(autoChildName(null)).toBe('');
    expect(autoChildName(undefined)).toBe('');
  });
});

describe('sideLedgerList — the "Direct Ledgers" bucket shows a node\'s own ledgers', () => {
  const AD = { name: 'AD Capital' }, ND = { name: 'ND Capital' };
  const SC = [{ name: 'Sup A' }, { name: 'Sup B' }];
  const pgNode = { name: 'Capital Account', ledgers: [AD, ND], children: [] };
  const gNode = { name: 'Sundry Creditors', ledgers: SC, children: [] };
  const sgNode = { name: 'Supplier Air Lines', ledgers: [{ name: 'IndiGo' }], children: [] };

  test('DIRECT at the Group level → the Parent Group\'s own ledgers', () => {
    // Capital Account selected → "Direct Ledgers" bucket → AD/ND Capital (gNode is null)
    expect(sideLedgerList({ pgNode, gNode: null, sgNode: null, gName: DIRECT_LEDGERS, sgName: '' })).toEqual([AD, ND]);
  });

  test('DIRECT at the Sub-Group level → the Group\'s own ledgers', () => {
    // Sundry Creditors selected → "Direct Ledgers" bucket → its 2 direct ledgers
    expect(sideLedgerList({ pgNode, gNode, sgNode: null, gName: 'Sundry Creditors', sgName: DIRECT_LEDGERS })).toEqual(SC);
  });

  test('a real Sub-Group selected → that sub-group\'s ledgers', () => {
    expect(sideLedgerList({ pgNode, gNode, sgNode, gName: 'Sundry Creditors', sgName: 'Supplier Air Lines' })).toEqual(sgNode.ledgers);
  });

  test('falls back to the deepest real node (group, then parent)', () => {
    expect(sideLedgerList({ pgNode, gNode, sgNode: null, gName: 'Sundry Creditors', sgName: '' })).toEqual(SC);
    expect(sideLedgerList({ pgNode, gNode: null, sgNode: null, gName: '', sgName: '' })).toEqual([AD, ND]);
  });

  test('null-safe', () => {
    expect(sideLedgerList({ pgNode: null, gNode: null, sgNode: null, gName: '', sgName: '' })).toEqual([]);
    expect(sideLedgerList({ pgNode: null, gNode: null, sgNode: null, gName: DIRECT_LEDGERS, sgName: '' })).toEqual([]);
  });
});
