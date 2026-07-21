import { LIMIT_BRANCHES, symbolFor, effectiveValue, overrideValue, hasOverride, overrideCount, cleanLimitValues } from '../utils/branchLimits';

const store = { default: { cashMaxPayment: 30000 }, branches: { BOM: { cashMaxPayment: 8000 } } };
const defaults = { cashMaxPayment: 20000, backdateDays: 3 };

describe('branchLimits helpers', () => {
  test('LIMIT_BRANCHES lead with the group default then the 6 branches', () => {
    expect(LIMIT_BRANCHES[0].code).toBe('default');
    expect(LIMIT_BRANCHES.map((b) => b.code)).toEqual(['default', 'MHUB', 'BOM', 'AMD', 'NBO', 'DAR', 'FBM']);
  });

  test('symbolFor: generic money fields follow the branch currency; others keep their unit', () => {
    expect(symbolFor('cashMaxPayment', '₹', '$')).toBe('$');   // USD branch
    expect(symbolFor('cashMaxPayment', '₹', '₹')).toBe('₹');
    expect(symbolFor('backdateDays', 'days', '$')).toBe('days'); // non-money untouched
    expect(symbolFor('decisionThresholdUSD', '$', '₹')).toBe('$'); // fixed-currency field kept
  });

  test('effectiveValue: branch override → group default → built-in default', () => {
    expect(effectiveValue(store, defaults, 'BOM', 'cashMaxPayment')).toBe(8000);   // override
    expect(effectiveValue(store, defaults, 'NBO', 'cashMaxPayment')).toBe(30000);  // group default
    expect(effectiveValue(store, defaults, 'BOM', 'backdateDays')).toBe(3);        // built-in default
    expect(effectiveValue(store, defaults, 'default', 'cashMaxPayment')).toBe(30000);
  });

  test('overrideValue / hasOverride / overrideCount reflect only explicit overrides', () => {
    expect(overrideValue(store, 'BOM', 'cashMaxPayment')).toBe('8000');
    expect(overrideValue(store, 'NBO', 'cashMaxPayment')).toBe('');   // inherits → blank
    expect(hasOverride(store, 'BOM', 'cashMaxPayment')).toBe(true);
    expect(hasOverride(store, 'NBO', 'cashMaxPayment')).toBe(false);
    expect(hasOverride(store, 'default', 'cashMaxPayment')).toBe(false);
    expect(overrideCount(store, 'BOM')).toBe(1);
    expect(overrideCount(store, 'NBO')).toBe(0);
    expect(overrideCount(store, 'default')).toBe(1);
  });

  test('cleanLimitValues: blank = inherit (cleared); filled must be a non-negative number', () => {
    const fields = [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' }];
    const { clean, bad } = cleanLimitValues(fields, { a: '5000', b: '', c: '-1' });
    expect(clean.a).toBe(5000);
    expect(clean.b).toBe('');        // inherit
    expect(bad).toEqual(['C']);      // negative rejected
  });
});
