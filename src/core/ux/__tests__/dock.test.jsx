// Dock store — pure list ops behind the ContextBar "minimized items" tray.
import { dockId, addParked, removeParked, MAX_PARKED } from '../dockCore';

const ledger = (name, branch = 'BOM', extra = {}) => ({ kind: 'ledger', label: name, branch, payload: { name, from: '', to: '', ...extra } });
const route = (r, label = r) => ({ kind: 'route', label, branch: '', payload: { route: r } });

describe('dockId', () => {
  test('ledger id keys on kind + name + branch', () => {
    expect(dockId(ledger('Global Konnection', 'BOM'))).toBe('ledger:Global Konnection:BOM');
  });
  test('same ledger under a different branch is a DIFFERENT chip', () => {
    expect(dockId(ledger('GK', 'BOM'))).not.toBe(dockId(ledger('GK', 'DEL')));
  });
  test('route id keys on the route path', () => {
    expect(dockId(route('/reports/pnl', 'Profit & Loss'))).toBe('route:/reports/pnl:');
  });
});

describe('addParked', () => {
  test('adds an id and puts the item newest-first', () => {
    const list = addParked([], ledger('A'));
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('ledger:A:BOM');
    const list2 = addParked(list, ledger('B'));
    expect(list2.map((x) => x.label)).toEqual(['B', 'A']);   // newest first
  });

  test('dedupes the same ledger+branch and floats it to the front', () => {
    let list = addParked([], ledger('A'));
    list = addParked(list, ledger('B'));
    list = addParked(list, ledger('A'));                     // re-park A
    expect(list).toHaveLength(2);
    expect(list.map((x) => x.label)).toEqual(['A', 'B']);
  });

  test('same name under two branches coexist as separate chips', () => {
    let list = addParked([], ledger('GK', 'BOM'));
    list = addParked(list, ledger('GK', 'DEL'));
    expect(list).toHaveLength(2);
    expect(list.map((x) => x.branch).sort()).toEqual(['BOM', 'DEL']);
  });

  test('caps at MAX_PARKED, dropping the oldest', () => {
    let list = [];
    for (let i = 0; i < MAX_PARKED + 3; i += 1) list = addParked(list, ledger(`L${i}`));
    expect(list).toHaveLength(MAX_PARKED);
    expect(list[0].label).toBe(`L${MAX_PARKED + 2}`);        // newest kept
    expect(list.some((x) => x.label === 'L0')).toBe(false);  // oldest dropped
  });

  test('tolerates a non-array prev value', () => {
    expect(addParked(undefined, ledger('A'))).toHaveLength(1);
  });
});

describe('removeParked', () => {
  test('removes by id and leaves the rest', () => {
    let list = addParked([], ledger('A'));
    list = addParked(list, ledger('B'));
    const after = removeParked(list, 'ledger:A:BOM');
    expect(after.map((x) => x.label)).toEqual(['B']);
  });
  test('no-op for an unknown id / non-array', () => {
    expect(removeParked([{ id: 'x' }], 'nope')).toEqual([{ id: 'x' }]);
    expect(removeParked(null, 'x')).toEqual([]);
  });
});
