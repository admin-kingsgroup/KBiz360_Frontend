// Regression: Africa (USD) branches must resolve to "$", never silently ₹.
//
// The old profileToCfg used `p.currency === 'USD' ? '$' : '₹'`, so a seeded
// company-profile that omitted the currency field (or used any non-USD code)
// collapsed the symbol to ₹ — and the seeded profile WON over the correct
// branch-record-derived "$". This locks in the robust resolver.
import { branchCfg, setBranchCfg } from '../referenceCache';

describe('branchCfg — currency symbol resolution', () => {
  test('derives "$" for a USD branch when no company-profile is seeded', () => {
    expect(branchCfg('NBO').cur).toBe('$'); // Nairobi, currency: USD in the branch record
    expect(branchCfg('DAR').cur).toBe('$');
    expect(branchCfg('FBM').cur).toBe('$');
  });

  test('India branches stay ₹', () => {
    expect(branchCfg('BOM').cur).toBe('₹');
  });

  test('seeded profile with currency:"USD" → "$"', () => {
    setBranchCfg([{ code: 'NBO', currency: 'USD' }]);
    expect(branchCfg('NBO').cur).toBe('$');
    expect(branchCfg('NBO').curCode).toBe('USD');
  });

  test('seeded profile that OMITS currency falls back to the branch record (still "$")', () => {
    // This is the exact bug: a profile without a currency field used to give ₹.
    setBranchCfg([{ code: 'NBO' }, { code: 'BOM' }]);
    expect(branchCfg('NBO').cur).toBe('$');
    expect(branchCfg('BOM').cur).toBe('₹');
  });

  test('explicit cur_sym on the profile always wins', () => {
    setBranchCfg([{ code: 'NBO', currency: 'USD', cur_sym: 'US$' }]);
    expect(branchCfg('NBO').cur).toBe('US$');
  });
});
