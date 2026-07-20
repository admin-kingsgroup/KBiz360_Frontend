// A VAT branch with NO company-profile falls back to deriveCfgFromBranch — which must follow an
// amended VAT master (backend registerVatRates → FE /api/vat-rates → setVatRateOverrides), not
// the built-in VAT_RATE constant. (Branches WITH a profile already get the master rate via the
// company-profile DTO → profileToCfg; this covers the unseeded-branch corner.)
import { setVatRateOverrides, branchCfg } from '../referenceCache';

describe('referenceCache · VAT-master overrides feed the no-profile fallback', () => {
  afterEach(() => setVatRateOverrides([]));   // reset the override map between tests

  test('no company-profile → vatRate follows the amended master, not the constant', () => {
    expect(branchCfg('NBO').vatRate).toBe(16);                       // built-in constant, nothing amended
    setVatRateOverrides([{ branch: 'NBO', rate: 20, active: true }]); // Owner amends Kenya VAT 16 → 20
    expect(branchCfg('NBO').vatRate).toBe(20);                       // fallback now follows the master
    expect(branchCfg('NBO').taxType).toBe('VAT');
  });

  test('an inactive / blank master row is ignored (stays on the constant)', () => {
    setVatRateOverrides([{ branch: 'DAR', rate: 25, active: false }, { branch: 'FBM', rate: '' }]);
    expect(branchCfg('DAR').vatRate).toBe(18);
    expect(branchCfg('FBM').vatRate).toBe(16);
  });
});
