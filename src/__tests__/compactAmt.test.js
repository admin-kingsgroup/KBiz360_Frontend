// Canonical compact money formatter — guards the lakh/crore thresholds (the recurring
// bug was gating "L" at 10,00,000 while dividing by 1,00,000, mislabelling 1–10 lakh as "K").
import { compactAmt, fmtINR } from '../core/format';

describe('compactAmt — Indian lakh/crore compaction', () => {
  test('1–10 lakh renders as "L" (NOT "K")', () => {
    expect(compactAmt(500000)).toBe('₹5.00L');
    expect(compactAmt(125000)).toBe('₹1.25L');
    expect(compactAmt(999999)).toBe('₹10.00L'); // rounds to 10.00L, still "L"
  });
  test('≥1 crore renders as "Cr"', () => {
    expect(compactAmt(10000000)).toBe('₹1.00Cr');
    expect(compactAmt(25000000)).toBe('₹2.50Cr');
  });
  test('below 1 lakh renders grouped rupees (no K abbreviation)', () => {
    expect(compactAmt(5000)).toBe('₹5,000');
    expect(compactAmt(999)).toBe('₹999');
  });
  test('currency is configurable and applied to the magnitude', () => {
    expect(compactAmt(500000, { currency: 'KSh ' })).toBe('KSh 5.00L');
    expect(compactAmt(500000, { currency: '' })).toBe('5.00L');
  });
  test('negatives keep the sign outside the abbreviation', () => {
    expect(compactAmt(-500000)).toBe('₹-5.00L');
  });
  test('zero / blank / NaN: 0 by default, em-dash with {dash:true}', () => {
    expect(compactAmt(0)).toBe('₹0');
    expect(compactAmt(null)).toBe('₹0');
    expect(compactAmt(NaN)).toBe('₹0');
    expect(compactAmt(0, { dash: true })).toBe('—');
    expect(compactAmt(undefined, { dash: true })).toBe('—');
  });
  test('fmtINR delegates to compactAmt with ₹', () => {
    expect(fmtINR(500000)).toBe('₹5.00L');
    expect(fmtINR(0)).toBe('₹0');
  });
});
