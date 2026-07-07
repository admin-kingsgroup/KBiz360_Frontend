import { curSym } from '../utils/currency';

// A branch's `currency` is an ISO CODE; row builders must pass the SYMBOL to money()
// (which prepends whatever it gets — the code would render "INR50,000"). Deterministic:
// works in tests / before the live currency metadata hydrates.
describe('curSym — currency code → display symbol', () => {
  test('INR → ₹, USD → $ (deterministic, no hydration needed)', () => {
    expect(curSym('INR')).toBe('₹');
    expect(curSym('USD')).toBe('$');
  });
  test('African USD-books codes resolve to $', () => {
    expect(curSym('KES')).toBe('$');
    expect(curSym('TZS')).toBe('$');
    expect(curSym('CDF')).toBe('$');
  });
  test('unknown / blank → ₹ (never the raw code)', () => {
    expect(curSym('XYZ')).toBe('₹');
    expect(curSym('')).toBe('₹');
    expect(curSym(undefined)).toBe('₹');
  });
});
