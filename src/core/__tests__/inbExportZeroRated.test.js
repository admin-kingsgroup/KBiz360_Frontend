// A zero-rated INTER-BRANCH EXPORT must bill no tax on the Service Fee — the grid banner says
// "Export · zero-rated" and the server posts taxAmt 0. The entry grid used to ignore that and
// still priced the fee at the seller branch's VAT rate, so an FBM→BOM export rendered a phantom
// "VAT/Service Fee (16%)" amount, an inflated INSO total, and an FX preview that quoted the buyer
// MORE than the backend derives. The fix folds the zero-rated case into the Without-VAT flag
// (`effNoVat`) that soPoGpVoucherEntry already threads into bookingTotals/lineCalc.
//
// These tests pin the INVARIANT that makes that one-flag fix safe: on a VAT (Africa) branch,
// noVat zeroes ONLY the sale-side service-fee tax and leaves the PURCHASE (input) VAT at full
// rate — voucherSpecs decouples input VAT from the sale choice on purpose ("a VAT branch still
// records/reclaims it under Without VAT"). If that ever changes, an FBM export would silently
// lose its supplier ITC and this suite fails loudly.
import { VSPECS, bookingTotals, lineCalc, isTaxable } from '../voucherSpecs.js';

const FBM = { branch: 'FBM', vatRate: 16 };   // Africa/VAT branch, 16%
const line = { fn: 'A', sn: 'B', base: 20000, tax: 5335, psvc: 500, ssvc: 1000 };

describe('INB zero-rated export — sale-side fee tax off, purchase VAT untouched', () => {
  test('VAT branch + noVat: the sale-side Service Fee tax is 0', () => {
    const taxed = lineCalc(VSPECS.SF, line, { ...FBM, noVat: false });
    const zero = lineCalc(VSPECS.SF, line, { ...FBM, noVat: true });
    expect(taxed.gstSvc).toBeGreaterThan(0);   // normally 16% VAT on the fee
    expect(zero.gstSvc).toBe(0);               // zero-rated export → nothing on the fee
    expect(zero.gstMk).toBe(0);                // and nothing on the markup
  });

  test('VAT branch + noVat: the PURCHASE (input) VAT survives at full rate — supplier ITC is NOT collateral damage', () => {
    const taxed = lineCalc(VSPECS.SF, line, { ...FBM, noVat: false });
    const zero = lineCalc(VSPECS.SF, line, { ...FBM, noVat: true });
    // This is the invariant the one-flag fix leans on: input VAT follows the SUPPLIER's invoice,
    // not the sale's zero-rating, so it must be identical either way and non-zero.
    expect(taxed.gstPur).toBeGreaterThan(0);
    expect(zero.gstPur).toBe(taxed.gstPur);
  });

  test('VAT branch + noVat: the SO total drops by exactly the fee tax (no inflated total / FX quote)', () => {
    const taxed = bookingTotals(VSPECS.SF, [line], { branch: 'FBM', vatRate: 16, noVat: false });
    const zero = bookingTotals(VSPECS.SF, [line], { branch: 'FBM', vatRate: 16, noVat: true });
    expect(zero.so.total).toBeLessThan(taxed.so.total);
    expect(zero.so.gst).toBe(0);
    // The PO cost (what the FX preview and GP lean on) is unchanged by the sale's zero-rating.
    expect(zero.po.gst).toBe(taxed.po.gst);
    expect(zero.po.total).toBe(taxed.po.total);
  });

  test('isTaxable is the sale-side gate only', () => {
    expect(isTaxable({ branch: 'FBM', noVat: true })).toBe(false);
    expect(isTaxable({ branch: 'FBM', noVat: false })).toBe(true);
  });

  test('an India (GST) branch is unaffected — noVat is an Africa-only control', () => {
    // soPoGpVoucherEntry gates effNoVat on isVatBranch, so a BOM INB export never zero-rates
    // its own fee here (BOM bills IGST cross-border by rule — billIgst defaults ON).
    const bom = lineCalc(VSPECS.SF, line, { branch: 'BOM', noVat: false });
    expect(bom.gstSvc).toBeGreaterThan(0);
  });
});
