// Branch-aware currency formatting (FIX 2 — B4).
// The all-branch money screens (paymentVerification, recurringVouchers, bankReco,
// chartBuilder) now derive their grouping locale from the ACTIVE branch currency via
// core/format.localeOf instead of a hardcoded 'en-IN'. These tests pin the helper
// contract those screens delegate to: ₹ → Indian lakh/crore grouping, $ (the Africa /
// VAT branches NBO/DAR/FBM) → Western thousands grouping.
import { localeOf, money, compactAmt } from '../format';
import { isVatBranch } from '../voucherSpecs';

describe('branch-aware currency formatting (FIX 2 helpers)', () => {
  test('localeOf forks grouping by currency symbol', () => {
    expect(localeOf('₹')).toBe('en-IN');
    expect(localeOf('₨')).toBe('en-IN');
    expect(localeOf('Rs')).toBe('en-IN');
    expect(localeOf('$')).toBe('en-US');
    expect(localeOf('US$')).toBe('en-US');
  });

  test('India (₹) uses lakh/crore grouping; Africa ($) uses Western thousands', () => {
    expect(money(1234567, '₹')).toBe('₹12,34,567');
    expect(money(1234567, '$')).toBe('$1,234,567');
  });

  test('a money screen deriving cur+locale from the branch shows $ for Africa and ₹ for India', () => {
    // Mirrors exactly what the changed screens now do:
    //   const cur = (bc(branch)||{}).cur;
    //   const f = n => cur + Number(n).toLocaleString(localeOf(cur));
    const f = (n, cur) => cur + Number(n).toLocaleString(localeOf(cur));
    expect(f(50000, '$')).toBe('$50,000');
    expect(f(50000, '₹')).toBe('₹50,000');
    expect(f(1234567, '$')).toBe('$1,234,567');   // Western: no '12,34,567'
    expect(f(1234567, '₹')).toBe('₹12,34,567');   // Indian lakh grouping
  });

  test('compactAmt abbreviates $ on K/M/B and ₹ on L/Cr', () => {
    expect(compactAmt(1500000, { currency: '$' })).toBe('$1.50M');
    expect(compactAmt(1500000, { currency: '₹' })).toBe('₹15.00L');
  });

  test('isVatBranch flags the Africa branches (drives RefundReissueFields VAT labels)', () => {
    ['NBO', 'DAR', 'FBM'].forEach((b) => expect(isVatBranch(b)).toBe(true));
    ['BOM', 'BOMMB', 'AMD'].forEach((b) => expect(isVatBranch(b)).toBe(false));
  });
});
