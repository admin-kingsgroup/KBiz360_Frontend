// GST place-of-supply auto-mode + foreign-supplier zero-GST rules.
//   • supplyTypeOf: a party's state vs the branch's home state → intra / inter;
//     a non-Indian country → foreign; India without a state → '' (unknown).
//     This is what auto-picks the SO/PO/GP Sale (customer) & Purchase (supplier)
//     GST modes on the booking screen.
//   • A FOREIGN supplier charges no Indian GST at all (import of service): the
//     purchase leg's GST is ZERO in both the fare model (auto-computed GST) and
//     the Holiday package model (entered Supplier Service GST is ignored).
// Pure, DB-free unit tests.
import { VSPECS, blankLine, bookingTotals, lineCalc } from '../voucherSpecs.js';
import { supplyTypeOf, stateCodeOf, homeStateForBranch, isIndiaCountry } from '../gstSupply.js';

describe('supplyTypeOf — party state vs branch home state', () => {
  test('BOM home state is Maharashtra (27), AMD is Gujarat (24)', () => {
    expect(homeStateForBranch('BOM')).toBe('27');
    expect(homeStateForBranch('AMD')).toBe('24');
    expect(homeStateForBranch('???')).toBe('27'); // default HO
  });
  test('same state as branch → intra', () => {
    expect(supplyTypeOf({ state: 'Maharashtra' }, 'BOM')).toBe('intra');
    expect(supplyTypeOf({ state: 'Gujarat' }, 'AMD')).toBe('intra');
  });
  test('different state → inter', () => {
    expect(supplyTypeOf({ state: 'Gujarat' }, 'BOM')).toBe('inter');
    expect(supplyTypeOf({ state: 'Rajasthan' }, 'BOM')).toBe('inter');
  });
  test('state resolves from stateCode or GSTIN too', () => {
    expect(supplyTypeOf({ stateCode: '27' }, 'BOM')).toBe('intra');
    expect(supplyTypeOf({ gstin: '24AAACA1234A1Z5' }, 'BOM')).toBe('inter');
    expect(stateCodeOf({ gstin: '27AAACA1234A1Z5' })).toBe('27');
  });
  test('foreign country → foreign; blank country = India', () => {
    expect(supplyTypeOf({ country: 'Singapore', state: '' }, 'BOM')).toBe('foreign');
    expect(isIndiaCountry('')).toBe(true);
    expect(isIndiaCountry('UAE')).toBe(false);
  });
  test('India without any state signal → "" (unknown — no auto-pick)', () => {
    expect(supplyTypeOf({ country: 'India' }, 'BOM')).toBe('');
    expect(supplyTypeOf({}, 'BOM')).toBe('');
  });
});

describe('foreign supplier → zero purchase GST (fare model)', () => {
  const SF = VSPECS.SF;
  const line = { ...blankLine(SF), base: 40000, psvc: 1000, markup: 2000, incentive: 500 };

  test('Indian supplier: 18% GST on the supplier service charge', () => {
    const c = lineCalc(SF, line, { branch: 'BOM' });
    expect(c.gstPur).toBeCloseTo(180, 2); // 18% × 1,000
  });
  test('foreign supplier: purchase GST is 0 and the cost drops by the GST', () => {
    const home = lineCalc(SF, line, { branch: 'BOM' });
    const c = lineCalc(SF, line, { branch: 'BOM', foreignSupplier: true });
    expect(c.gstPur).toBe(0);
    expect(c.finalPurchase).toBeCloseTo(home.finalPurchase - home.gstPur, 2);
    expect(c.tds).toBe(0); // existing rule: no 194H withholding by a foreign vendor
  });
  test('bookingTotals: po.gst is 0 under foreignSupplier', () => {
    const normal = bookingTotals(SF, [line], { branch: 'BOM' });
    const foreign = bookingTotals(SF, [line], { branch: 'BOM', foreignSupplier: true });
    expect(normal.po.gst).toBeCloseTo(180, 2);
    expect(foreign.po.gst).toBe(0);
    expect(foreign.po.incentiveTds).toBe(0);
  });
});

describe('foreign supplier → entered Supplier Service GST ignored (package model)', () => {
  const SH = VSPECS.SH;
  const line = { ...blankLine(SH), pkg: 'Thailand', base: 32520, psvc: 0, psvcGst: 1626, markup: 4921.64 };

  test('Indian DMC: entered GST rides as ITC on the purchase', () => {
    const { po } = bookingTotals(SH, [line], { branch: 'BOM', packageType: 'International' });
    expect(po.gst).toBeCloseTo(1626, 2);
  });
  test('foreign DMC: GST zeroed AND excluded from the gross payable', () => {
    const indian = bookingTotals(SH, [line], { branch: 'BOM', packageType: 'International' });
    const { po } = bookingTotals(SH, [line], { branch: 'BOM', packageType: 'International', foreignSupplier: true });
    expect(po.gst).toBe(0);
    expect(po.total).toBeCloseTo(indian.po.total - 1626, 2);
  });
});
