// Global search now reads LIVE GP bills (/api/accounting/gp-bills) instead of the
// emptied GP_BILLS seed. These pin the filter/rank helper the search bar uses.
import { gpBillHaystack, filterGpBills } from '../core/registerSearch';

// Shape returned by /api/accounting/gp-bills (per-file GP row).
const bills = [
  { id: 'SF/26/41', branch: 'BOM', date: '2026-02-10', mod: 'Flight', client: 'Globe Trekkers Pvt Ltd', supplier: 'Emirates Airlines', consultant: 'Afshin', airline: 'Emirates', dest: 'BOM-DXB', sell: 5990, cost: 5137 },
  { id: 'SH/26/12', branch: 'BOM', date: '2026-01-05', mod: 'Hotel', client: 'Acme Corp', supplier: 'Taj Hotels', consultant: 'Riya', airline: '', dest: 'Goa', sell: 20000, cost: 18000 },
  { id: 'SC/26/03', branch: 'BOM', date: '2026-03-01', mod: 'Car', client: 'Zen Travels', supplier: 'Avis', consultant: 'Sam', airline: '', dest: 'Pune', sell: 0, cost: 0 },
];

describe('gpBillHaystack', () => {
  test('flattens the searchable fields lower-cased', () => {
    const h = gpBillHaystack(bills[0]);
    expect(h).toContain('sf/26/41');
    expect(h).toContain('globe trekkers');
    expect(h).toContain('emirates');
    expect(h).toContain('bom-dxb');
    expect(h).toContain('afshin');
  });
  test('handles missing fields without throwing', () => {
    expect(() => gpBillHaystack({ id: 'X' })).not.toThrow();
    expect(gpBillHaystack({ id: 'X1' })).toBe('x1');
  });
});

describe('filterGpBills', () => {
  test('returns nothing for a query under 2 chars', () => {
    expect(filterGpBills(bills, 'a')).toEqual([]);
    expect(filterGpBills(bills, '')).toEqual([]);
  });
  test('finds by client name (case-insensitive)', () => {
    const r = filterGpBills(bills, 'globe');
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('SF/26/41');
  });
  test('finds by destination and by airline', () => {
    expect(filterGpBills(bills, 'dxb').map((b) => b.id)).toEqual(['SF/26/41']);
    expect(filterGpBills(bills, 'avis').map((b) => b.id)).toEqual(['SC/26/03']);
  });
  test('computes gp and gpPct, guarding zero revenue', () => {
    const r = filterGpBills(bills, 'globe')[0];
    expect(r.gp).toBe(853);
    expect(r.gpPct).toBe(+((853 / 5990) * 100).toFixed(1));
    const zero = filterGpBills(bills, 'zen')[0];
    expect(zero.gpPct).toBe(0); // sell=0 → no NaN/Infinity
  });
  test('no match → empty array (empty in, empty out)', () => {
    expect(filterGpBills(bills, 'nonexistent')).toEqual([]);
    expect(filterGpBills([], 'globe')).toEqual([]);
  });
  test('respects the result limit', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ id: `V${i}`, client: 'Common Client', sell: 100, cost: 10 }));
    expect(filterGpBills(many, 'common', 50)).toHaveLength(50);
  });
});
