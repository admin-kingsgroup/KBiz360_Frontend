// P&L "expand all" drill helpers — pure, DOM-free unit tests.
import { moduleDetailRows, moduleExpandKeys, moduleHasDetail, moduleDetailKey, ledgerDetailKey } from '../pnlDetail';

const flights = {
  key: 'Flights', name: 'Flights', sales: 15000, cogs: 13000,
  heads: {
    sales: [{ ledger: 'Sales — Air Tickets', amount: 15000, components: [{ label: 'Base Fare', amount: 12000 }, { label: 'K3', amount: 3000 }] }],
    cogs: [{ ledger: 'Purchase — Air Tickets', amount: 13000, components: [{ label: 'Base Fare', amount: 11000 }, { label: 'K3', amount: 2000 }] }],
  },
};
const hotelsNoComps = {
  key: 'Hotels', name: 'Hotels', sales: 500, cogs: 400,
  heads: { sales: [{ ledger: 'Sales — Hotel Bookings', amount: 500, components: [] }], cogs: [] },
};
const bare = { key: 'Misc', name: 'Miscellaneous', sales: 0, cogs: 0 }; // no heads at all

// isOpen stub backed by a Set of "open" keys.
const opener = (openKeys) => (key) => openKeys.has(key);

describe('moduleHasDetail', () => {
  test('true only when the side has ledger heads', () => {
    expect(moduleHasDetail(flights, 'sales')).toBe(true);
    expect(moduleHasDetail(hotelsNoComps, 'cogs')).toBe(false); // cogs is []
    expect(moduleHasDetail(bare, 'sales')).toBe(false);          // no heads key
  });
});

describe('moduleDetailRows', () => {
  test('collapsed module → ledger head rows only, no components', () => {
    const rows = moduleDetailRows(flights, 'sales', opener(new Set()));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ledger: 'Sales — Air Tickets', ledgerHead: true, expandable: true, open: false });
    expect(rows.some((r) => r.component)).toBe(false);
  });

  test('open ledger → head row followed by its component rows', () => {
    const lkey = ledgerDetailKey(flights, 'sales', 'Sales — Air Tickets');
    const rows = moduleDetailRows(flights, 'sales', opener(new Set([lkey])));
    expect(rows).toHaveLength(3); // head + 2 components
    expect(rows[0].open).toBe(true);
    expect(rows.slice(1).every((r) => r.component)).toBe(true);
    expect(rows[1]).toMatchObject({ label: 'Base Fare', amount: 12000, component: true });
  });

  test('ledger with no components is not expandable', () => {
    const rows = moduleDetailRows(hotelsNoComps, 'sales', opener(new Set()));
    expect(rows).toHaveLength(1);
    expect(rows[0].expandable).toBe(false);
  });

  test('module with no heads → no rows', () => {
    expect(moduleDetailRows(bare, 'sales', opener(new Set()))).toEqual([]);
  });

  test('keyPrefix flows into the generated ekey', () => {
    const rows = moduleDetailRows(flights, 'cogs', opener(new Set()), 'x:');
    expect(rows[0].ekey.startsWith('x:l:cogs:Flights:')).toBe(true);
  });
});

describe('moduleExpandKeys', () => {
  test('collects module + ledger keys for both sides, skipping empty sides', () => {
    const keys = moduleExpandKeys([flights, hotelsNoComps, bare]);
    // Flights: 2 module keys (sales+cogs) + 2 ledger keys = 4
    expect(keys).toContain(moduleDetailKey(flights, 'sales'));
    expect(keys).toContain(moduleDetailKey(flights, 'cogs'));
    expect(keys).toContain(ledgerDetailKey(flights, 'sales', 'Sales — Air Tickets'));
    // Hotels: only the sales side has a head
    expect(keys).toContain(moduleDetailKey(hotelsNoComps, 'sales'));
    expect(keys).not.toContain(moduleDetailKey(hotelsNoComps, 'cogs'));
    // Misc (bare) contributes nothing
    expect(keys.some((k) => k.includes('Miscellaneous') || k.includes(':Misc'))).toBe(false);
  });

  test('restricting sides to sales only omits cogs keys', () => {
    const keys = moduleExpandKeys([flights], '', ['sales']);
    expect(keys.every((k) => !k.includes(':cogs:'))).toBe(true);
  });

  test('empty / undefined module list → []', () => {
    expect(moduleExpandKeys([])).toEqual([]);
    expect(moduleExpandKeys(undefined)).toEqual([]);
  });
});
