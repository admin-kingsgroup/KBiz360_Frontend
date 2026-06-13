// P&L "expand all" drill helpers — pure, DOM-free unit tests.
import {
  moduleDetailRows, moduleExpandKeys, moduleHasDetail, moduleDetailKey, ledgerDetailKey,
  moduleHasSubs, moduleSubDetailRows, moduleDrillRows, subDetailKey, subLedgerDetailKey, stripLeafPrefix,
} from '../pnlDetail';

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

// Multi-leaf module (Flights) with Int'l / Domestic / Unspecified sub-centres.
// `heads` at module level is the merged roll-up; each sub carries its own split.
const flightsSubs = {
  key: 'Flights', name: 'Flights', hasSubs: true, sales: 15000, cogs: 13000,
  heads: {
    sales: [{ ledger: 'Sales — Air Tickets', amount: 15000, components: [{ label: 'Base Fare', amount: 12000 }] }],
    cogs: [{ ledger: 'Purchase — Air Tickets', amount: 13000, components: [] }],
  },
  subs: [
    { code: 'FLT-INT', name: 'Flight — International', sales: 10000, cogs: 9000,
      heads: { sales: [{ ledger: 'Sales — Air Tickets', amount: 10000, components: [{ label: 'Base Fare', amount: 8000 }, { label: 'K3', amount: 2000 }] }],
               cogs: [{ ledger: 'Purchase — Air Tickets', amount: 9000, components: [] }] } },
    { code: 'FLT-DOM', name: 'Flight — Domestic', sales: 5000, cogs: 4000,
      heads: { sales: [{ ledger: 'Sales — Air Tickets', amount: 5000, components: [{ label: 'Base Fare', amount: 4000 }] }],
               cogs: [{ ledger: 'Purchase — Air Tickets', amount: 4000, components: [] }] } },
    // Unspecified: a sales amount but no captured heads → shown, not expandable.
    { code: 'FLT-UNS', name: 'Flight — Unspecified', sales: 200, cogs: 0, heads: { sales: [], cogs: [] } },
  ],
};

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

  test('multi-leaf module emits sub-centre + nested ledger keys (not module ledger keys)', () => {
    const keys = moduleExpandKeys([flightsSubs], '', ['sales']);
    expect(keys).toContain(moduleDetailKey(flightsSubs, 'sales'));
    expect(keys).toContain(subDetailKey(flightsSubs, 'sales', 'FLT-INT'));
    expect(keys).toContain(subDetailKey(flightsSubs, 'sales', 'FLT-DOM'));
    expect(keys).toContain(subLedgerDetailKey(flightsSubs, 'sales', 'FLT-INT', 'Sales — Air Tickets'));
    // Unspecified has an amount but no heads → its sub key IS included, no ledger key under it.
    expect(keys).toContain(subDetailKey(flightsSubs, 'sales', 'FLT-UNS'));
    expect(keys.some((k) => k.includes('FLT-UNS:'))).toBe(false);
    // The merged module-level ledger key is NOT used for multi-leaf modules.
    expect(keys).not.toContain(ledgerDetailKey(flightsSubs, 'sales', 'Sales — Air Tickets'));
  });
});

describe('moduleHasSubs / moduleHasDetail (multi-leaf)', () => {
  test('moduleHasSubs true only for hasSubs modules with a subs array', () => {
    expect(moduleHasSubs(flightsSubs)).toBe(true);
    expect(moduleHasSubs(flights)).toBe(false);       // no subs
    expect(moduleHasSubs(hotelsNoComps)).toBe(false);
  });

  test('moduleHasDetail true when a sub-centre has activity even without module heads', () => {
    const noMergedHeads = { ...flightsSubs, heads: { sales: [], cogs: [] } };
    expect(moduleHasDetail(noMergedHeads, 'sales')).toBe(true); // subs still carry detail
  });
});

describe('moduleSubDetailRows', () => {
  test('collapsed module → one row per active sub-centre, Int\'l + Domestic + Unspecified', () => {
    const rows = moduleSubDetailRows(flightsSubs, 'sales', opener(new Set()));
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.label)).toEqual(['Flight — International', 'Flight — Domestic', 'Flight — Unspecified']);
    expect(rows.every((r) => r.costCentre)).toBe(true);
    expect(rows[0]).toMatchObject({ subCode: 'FLT-INT', amount: 10000, expandable: true, open: false });
  });

  test('Unspecified shows with its amount but is not expandable (no heads)', () => {
    const uns = moduleSubDetailRows(flightsSubs, 'sales', opener(new Set())).find((r) => r.subCode === 'FLT-UNS');
    expect(uns).toMatchObject({ amount: 200, expandable: false });
  });

  test('sub-centre with no activity on a side is skipped (Unspecified has no cogs)', () => {
    const cogs = moduleSubDetailRows(flightsSubs, 'cogs', opener(new Set()));
    expect(cogs.map((r) => r.subCode)).toEqual(['FLT-INT', 'FLT-DOM']); // FLT-UNS (cogs 0) dropped
  });

  test('open sub-centre → its own split ledger → components, keyed per cost-centre', () => {
    const sk = subDetailKey(flightsSubs, 'sales', 'FLT-INT');
    const lk = subLedgerDetailKey(flightsSubs, 'sales', 'FLT-INT', 'Sales — Air Tickets');
    const rows = moduleSubDetailRows(flightsSubs, 'sales', opener(new Set([sk, lk])));
    const int = rows.find((r) => r.subCode === 'FLT-INT');
    expect(int.open).toBe(true);
    // Int'l ledger components are the Int'l ones (8000 + 2000), NOT the merged module set.
    const comps = rows.filter((r) => r.component);
    expect(comps).toEqual([
      { label: 'Base Fare', amount: 8000, component: true },
      { label: 'K3', amount: 2000, component: true },
    ]);
  });

  test('ledger keys are namespaced by sub-centre so Int\'l and Domestic do not collide', () => {
    const intKey = subLedgerDetailKey(flightsSubs, 'sales', 'FLT-INT', 'Sales — Air Tickets');
    const domKey = subLedgerDetailKey(flightsSubs, 'sales', 'FLT-DOM', 'Sales — Air Tickets');
    expect(intKey).not.toBe(domKey);
  });
});

describe('stripLeafPrefix', () => {
  test('strips only the leading short cost-centre prefix', () => {
    expect(stripLeafPrefix('IT-Base Fare')).toBe('Base Fare');
    expect(stripLeafPrefix('DT-K3-Taxes')).toBe('K3-Taxes');   // inner token kept
    expect(stripLeafPrefix('HP-Land Package')).toBe('Land Package');
    expect(stripLeafPrefix('IT-Base Fare [Pur]')).toBe('Base Fare [Pur]'); // suffix kept
    expect(stripLeafPrefix('Sales — Air Tickets')).toBe('Sales — Air Tickets'); // no prefix
  });
});

describe('moduleSubDetailRows label stripping', () => {
  const prefixed = {
    key: 'Flights', name: 'Flights', hasSubs: true, sales: 100, cogs: 0,
    subs: [{ code: 'FLT-INT', name: 'Flight — International', sales: 100, cogs: 0,
      heads: { sales: [{ ledger: 'IT-Base Fare', amount: 100, components: [{ label: 'Servicecharge', amount: 5 }] }], cogs: [] } }],
  };
  test('open sub → ledger label stripped, real ledger name preserved for drill', () => {
    const sk = subDetailKey(prefixed, 'sales', 'FLT-INT');
    const rows = moduleSubDetailRows(prefixed, 'sales', opener(new Set([sk])));
    const head = rows.find((r) => r.ledgerHead);
    expect(head.label).toBe('Base Fare');     // prefix stripped for display
    expect(head.ledger).toBe('IT-Base Fare'); // drill-through keeps the real ledger
  });
});

describe('moduleDrillRows', () => {
  test('routes multi-leaf modules through the sub-centre split', () => {
    const rows = moduleDrillRows(flightsSubs, 'sales', opener(new Set()));
    expect(rows.every((r) => r.costCentre)).toBe(true);
  });

  test('routes single-leaf modules through the flat ledger drill', () => {
    const rows = moduleDrillRows(flights, 'sales', opener(new Set()));
    expect(rows.every((r) => r.ledgerHead)).toBe(true);
  });
});
