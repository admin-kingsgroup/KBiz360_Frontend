import { resolveCell, hasCellOverride, enforcedCount, BUILTIN_CELL } from '../utils/voucherPolicy';

const store = {
  default: { payment: { enforce: true, threshold: 50000 } },
  branches: { BOM: { payment: { threshold: 20000 } }, FBM: { payment: { enforce: false } } },
};

describe('voucherPolicy (FE) helpers', () => {
  test('resolveCell: builtin ← group default ← branch override', () => {
    expect(resolveCell(store, 'BOM', 'payment')).toEqual({ enforce: true, threshold: 20000, effectiveDate: '' });
    expect(resolveCell(store, 'AMD', 'payment')).toEqual({ enforce: true, threshold: 50000, effectiveDate: '' });
    expect(resolveCell(store, 'FBM', 'payment').enforce).toBe(false);
    expect(resolveCell(store, 'BOM', 'journal')).toEqual(BUILTIN_CELL);
  });
  test('hasCellOverride: only true when the branch explicitly overrides', () => {
    expect(hasCellOverride(store, 'BOM', 'payment')).toBe(true);
    expect(hasCellOverride(store, 'AMD', 'payment')).toBe(false);
    expect(hasCellOverride(store, 'default', 'payment')).toBe(false);
  });
  test('enforcedCount: how many types a branch enforces', () => {
    expect(enforcedCount(store, 'BOM', ['payment', 'journal'])).toBe(1);   // payment inherits enforce:true
    expect(enforcedCount(store, 'FBM', ['payment', 'journal'])).toBe(0);   // FBM opted out
  });
});
