// A zero-rated INTER-BRANCH EXPORT must bill no tax on the Service Fee — the grid banner says
// "Export · zero-rated" and the server posts taxAmt 0. The entry grid used to ignore that and
// still priced the fee at the seller branch's VAT rate, so an FBM→BOM export rendered a phantom
// "VAT/Service Fee (16%)" amount, an inflated INSO total, and an FX preview that quoted the buyer
// MORE than the backend derives. The fix folds the zero-rated case into the Without-VAT flag
// (`effNoVat`) that soPoGpVoucherEntry already threads into bookingTotals/lineCalc.
//
// The INB export one-flag fix now rides `saleZeroRated`, NOT `noVat` — the two mean different
// things (Owner's rule 2026-07-21): `noVat` (the Without VAT toggle) makes the WHOLE booking
// VAT-free (both sale OUTPUT and purchase INPUT VAT), while `saleZeroRated` (INB export) zeroes the
// SALE side only and KEEPS the input VAT the branch was actually charged. The first describe block
// below pins the Without-VAT "no VAT anywhere" rule; the second pins the export invariant.
import { VSPECS, bookingTotals, lineCalc, isTaxable } from '../voucherSpecs.js';

const FBM = { branch: 'FBM', vatRate: 16 };   // Africa/VAT branch, 16%
const line = { fn: 'A', sn: 'B', base: 20000, tax: 5335, psvc: 500, ssvc: 1000 };

describe('Without VAT (noVat) — VAT off on BOTH sides', () => {
  test('VAT branch + noVat: the sale-side Service Fee tax is 0', () => {
    const taxed = lineCalc(VSPECS.SF, line, { ...FBM, noVat: false });
    const zero = lineCalc(VSPECS.SF, line, { ...FBM, noVat: true });
    expect(taxed.gstSvc).toBeGreaterThan(0);   // normally 16% VAT on the fee
    expect(zero.gstSvc).toBe(0);               // Without VAT → nothing on the fee
    expect(zero.gstMk).toBe(0);                // and nothing on the markup
  });

  test('VAT branch + noVat: the PURCHASE (input) VAT is ALSO zeroed — Without VAT = no VAT anywhere', () => {
    const taxed = lineCalc(VSPECS.SF, line, { ...FBM, noVat: false });
    const zero = lineCalc(VSPECS.SF, line, { ...FBM, noVat: true });
    // Owner's rule (2026-07-21): a Without-VAT booking is VAT-free on BOTH sides. (Contrast the
    // saleZeroRated INB-export case below, which keeps input VAT.)
    expect(taxed.gstPur).toBeGreaterThan(0);
    expect(zero.gstPur).toBe(0);
  });

  test('VAT branch + noVat: the SO fee tax AND the PO input VAT both go to 0', () => {
    const taxed = bookingTotals(VSPECS.SF, [line], { branch: 'FBM', vatRate: 16, noVat: false });
    const zero = bookingTotals(VSPECS.SF, [line], { branch: 'FBM', vatRate: 16, noVat: true });
    expect(zero.so.total).toBeLessThan(taxed.so.total);
    expect(zero.so.gst).toBe(0);
    // Without VAT now zeroes the purchase-side input VAT too (whole booking VAT-free).
    expect(taxed.po.gst).toBeGreaterThan(0);
    expect(zero.po.gst).toBe(0);
  });

  test('isTaxable is the sale-side gate only', () => {
    expect(isTaxable({ branch: 'FBM', noVat: true })).toBe(false);
    expect(isTaxable({ branch: 'FBM', noVat: false })).toBe(true);
  });

  test('noVat stays an Africa-only control — an India branch ignores it', () => {
    const bom = lineCalc(VSPECS.SF, line, { branch: 'BOM', noVat: false });
    expect(bom.gstSvc).toBeGreaterThan(0);
  });
});

// A zero-rated export is zero-rated for ANY seller — the server applies taxRate 0 on
// cross-border + tick-off with no India/Africa split. `noVat` could not express that: it is
// isVatBranch-gated in the entry screen, so AMD/BOMMB (which default the IGST tick OFF) showed
// 18% under an "Export · zero-rated" banner and over-quoted the buyer on the FX preview. It also
// could not simply be un-gated: on India, noVat zeroes purRateOf and would wipe the purchase
// GST/ITC. Hence a sale-side-only flag.
describe('saleZeroRated — sale-side only, works for India sellers too', () => {
  const IN = { branch: 'AMD' };   // India/GST branch — an INB export seller that defaults tick OFF

  test('India seller: a zero-rated export bills nothing on the fee (the AMD/BOMMB gap)', () => {
    const taxed = lineCalc(VSPECS.SF, line, { ...IN, saleZeroRated: false });
    const zero = lineCalc(VSPECS.SF, line, { ...IN, saleZeroRated: true });
    expect(taxed.gstSvc).toBeGreaterThan(0);   // normally 18% GST on the fee
    expect(zero.gstSvc).toBe(0);
    expect(zero.gstMk).toBe(0);
  });

  test('India seller: the PURCHASE GST/ITC survives — the reason noVat could not be reused', () => {
    const taxed = lineCalc(VSPECS.SF, line, { ...IN, saleZeroRated: false });
    const zero = lineCalc(VSPECS.SF, line, { ...IN, saleZeroRated: true });
    expect(taxed.gstPur).toBeGreaterThan(0);
    expect(zero.gstPur).toBe(taxed.gstPur);
    // Contrast: noVat on India DOES kill the input GST — exactly the trap avoided.
    expect(lineCalc(VSPECS.SF, line, { ...IN, noVat: true }).gstPur).toBe(0);
  });

  test('Africa seller: saleZeroRated zeroes the fee and keeps input VAT', () => {
    const zero = lineCalc(VSPECS.SF, line, { ...FBM, saleZeroRated: true });
    expect(zero.gstSvc).toBe(0);
    expect(zero.gstPur).toBe(lineCalc(VSPECS.SF, line, { ...FBM, saleZeroRated: false }).gstPur);
  });

  test('SO total drops by the fee tax on an India export; PO cost untouched', () => {
    const taxed = bookingTotals(VSPECS.SF, [line], { branch: 'AMD', saleZeroRated: false });
    const zero = bookingTotals(VSPECS.SF, [line], { branch: 'AMD', saleZeroRated: true });
    expect(zero.so.gst).toBe(0);
    expect(zero.so.total).toBeLessThan(taxed.so.total);
    expect(zero.po.gst).toBe(taxed.po.gst);       // ITC intact
    expect(zero.po.total).toBe(taxed.po.total);
  });

  test('isTaxable reflects saleZeroRated as well as noVat', () => {
    expect(isTaxable({ branch: 'AMD', saleZeroRated: true })).toBe(false);
    expect(isTaxable({ branch: 'AMD', saleZeroRated: false })).toBe(true);
  });
});
