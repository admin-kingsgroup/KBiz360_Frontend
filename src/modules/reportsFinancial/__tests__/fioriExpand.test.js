// The Fiori "Expand all" controls (added to the Fiori P&L and Balance Sheet so
// all three views — Fiori · Classic · Vertical — can bulk-expand) drive the
// toggle state from these pure key lists. Verify they enumerate every expandable
// node and stay collision-safe across both sides.
import { splitSubGroups, bsFioriExpandKeys, pnlFioriExpandKeys } from '../fioriExpand';

describe('splitSubGroups', () => {
  test('separates named sub-groups (amount-ranked) from direct ledgers', () => {
    const { subs, direct } = splitSubGroups([
      { name: 'HDFC', amount: 10, subGroup: 'Bank Accounts' },
      { name: 'ICICI', amount: 40, subGroup: 'Bank Accounts' },
      { name: 'Cash', amount: 5, subGroup: '' },
      { name: 'SBI FD', amount: 100, subGroup: 'Fixed Deposits' },
    ]);
    expect(direct.map((l) => l.name)).toEqual(['Cash']);
    // ranked by |amount|: Fixed Deposits (100) before Bank Accounts (50)
    expect(subs.map((s) => s.name)).toEqual(['Fixed Deposits', 'Bank Accounts']);
    expect(subs.find((s) => s.name === 'Bank Accounts').amount).toBe(50);
  });
});

describe('bsFioriExpandKeys', () => {
  const d = {
    liabilities: [
      { group: 'Capital Account', ledgers: [{ name: 'Owner', amount: 100, subGroup: '' }] },
      { group: 'Loans', ledgers: [{ name: 'HDFC Loan', amount: 50, subGroup: 'Secured Loans' }] },
      { group: 'Empty', ledgers: [] },
    ],
    assets: [
      { group: 'Bank', ledgers: [{ name: 'ICICI', amount: 70, subGroup: 'Bank Accounts' }] },
    ],
  };

  test('collects every group-with-children + every sub-group key across both sides', () => {
    const { groupKeys, subKeys } = bsFioriExpandKeys(d, false);
    expect(groupKeys).toEqual(['Capital Account', 'Loans', 'Bank']); // 'Empty' has no children → excluded
    expect(subKeys).toEqual(['Loans|Secured Loans', 'Bank|Bank Accounts']);
  });

  test('summary mode yields no keys (nothing is expandable)', () => {
    expect(bsFioriExpandKeys(d, true)).toEqual({ groupKeys: [], subKeys: [] });
  });

  test('null data is safe', () => {
    expect(bsFioriExpandKeys(null, false)).toEqual({ groupKeys: [], subKeys: [] });
  });
});

describe('pnlFioriExpandKeys', () => {
  const d = {
    modules: [
      { key: 'FLT', hasSubs: true, subs: [
        { code: 'INT', heads: { sales: [{ ledger: 'Base Fare', components: [{ label: 'YQ' }] }], cogs: [] } },
        { code: 'DOM', heads: { sales: [], cogs: [{ ledger: 'Net Fare', components: [] }] } }, // no comps → no head key
      ] },
      { key: 'HOT', hasSubs: false, heads: { sales: [{ ledger: 'Room', components: [{ label: 'Tax' }] }], cogs: [] } },
    ],
  };
  const expBuckets = [
    { name: 'Fixed', groups: [{ name: 'Rent' }, { name: 'Salaries' }] },
    { name: 'Variable', groups: [{ name: 'Fuel' }] },
  ];

  test('enumerates modules, sub-centres, component-bearing heads, buckets and expense groups', () => {
    const k = pnlFioriExpandKeys(d, expBuckets);
    expect(k.modKeys).toEqual(['FLT', 'HOT']);
    expect(k.subKeys).toEqual(['FLT|INT', 'FLT|DOM']);
    // only heads WITH components are collectable
    expect(k.headKeys).toEqual(['FLT|INT:sales:Base Fare', 'HOT:sales:Room']);
    expect(k.bucketKeys).toEqual(['Fixed', 'Variable']);
    expect(k.expKeys).toEqual(['Fixed|Rent', 'Fixed|Salaries', 'Variable|Fuel']);
  });

  test('missing modules / buckets are safe', () => {
    expect(pnlFioriExpandKeys({}, undefined)).toEqual({ modKeys: [], subKeys: [], headKeys: [], bucketKeys: [], expKeys: [] });
  });
});
