// A branch withholds under the law of where it OPERATES. India (BOM/AMD/MHUB) withholds
// 194H at the statutory 2%; an Africa branch (NBO Kenya, DAR Tanzania, FBM DR Congo)
// withholds that country's WHT.
//
// The bug: `tds = foreignSupplier ? 0 : incentive * 0.02` had NO branch gate — the only
// switch was "is the supplier non-Indian?". So an FBM booking with an Indian or blank-country
// supplier withheld India's 194H 2% in DR Congo: a real WHT-Receivable debit and a supplier
// payable reduced by 2% of commission, at a foreign statutory rate. It was HALF-fixed, which
// is what hid it — the column header and posting narration already said "WHT" for Africa
// (`whtLabel = isVatBranch ? 'WHT' : 'TDS 194H'`), so the screen looked right while the math
// was India's. Contrast TCS 206C(1G), which has carried `!isVatBranch(ctx.branch)` all along.
//
// The rate now comes from the supplier master's `whtRate` — a field that already existed for
// exactly this ("the VAT-world counterparts of gstin/tdsSection") and was never read. Unset
// → 0 → nothing withheld: safe by default, and no data migration needed. A live survey found
// 0 Africa suppliers with a whtRate set, so today this withholds nothing on Africa instead of
// a wrong 2%.
//
// The FE number is the one that POSTS: bookingTotals → po.incentiveTds → stored on the
// booking → posting.builder:279 books the WHT leg and creditorNet adds it back. The approval
// gate does NOT validate incentiveTds, so this needed no lock-step BE deploy.
import { VSPECS, bookingTotals, lineCalc, INCENTIVE_TDS_RATE, isVatBranch } from '../voucherSpecs.js';

const line = { fn: 'A', sn: 'B', base: 10000, psvc: 500, ssvc: 1000, incentive: 5000 };
const ctx = (over = {}) => ({ branch: 'BOM', vatRate: 16, ...over });

describe('withholding rate follows the BRANCH country, not the supplier country', () => {
  test('India branch: 194H stays at the statutory 2% (the control — must not change)', () => {
    expect(lineCalc(VSPECS.SF, line, ctx({ branch: 'BOM' })).tds).toBe(100);   // 5000 × 2%
    expect(INCENTIVE_TDS_RATE).toBe(0.02);
  });

  test('THE BUG: an Africa branch no longer withholds India\'s 2%', () => {
    // Was 100 — India's 194H rate, posted in DR Congo.
    expect(lineCalc(VSPECS.SF, line, ctx({ branch: 'FBM' })).tds).toBe(0);
    expect(lineCalc(VSPECS.SF, line, ctx({ branch: 'NBO' })).tds).toBe(0);
    expect(lineCalc(VSPECS.SF, line, ctx({ branch: 'DAR' })).tds).toBe(0);
  });

  test('an Africa branch withholds at the SUPPLIER MASTER\'s whtRate once it is set', () => {
    expect(lineCalc(VSPECS.SF, line, ctx({ branch: 'FBM', supplierWhtRate: 10 })).tds).toBe(500);
    expect(lineCalc(VSPECS.SF, line, ctx({ branch: 'NBO', supplierWhtRate: 5 })).tds).toBe(250);
    expect(lineCalc(VSPECS.SF, line, ctx({ branch: 'DAR', supplierWhtRate: 15 })).tds).toBe(750);
  });

  test('an India branch IGNORES whtRate — 194H is statutory, not per-supplier', () => {
    expect(lineCalc(VSPECS.SF, line, ctx({ branch: 'BOM', supplierWhtRate: 10 })).tds).toBe(100);
  });

  test('a foreign supplier still withholds nothing, on any branch', () => {
    // foreignSupplier zeroes it outright — whtRateOf only decides the rate when it applies.
    expect(lineCalc(VSPECS.SF, line, ctx({ branch: 'BOM', foreignSupplier: true })).tds).toBe(0);
    expect(lineCalc(VSPECS.SF, line, ctx({ branch: 'FBM', foreignSupplier: true, supplierWhtRate: 10 })).tds).toBe(0);
  });

  test('the Holiday package path behaves identically (lineCalcPackage had the same line)', () => {
    const pkgLine = { ...line, markup: 2000 };
    const c = (b, over) => lineCalc(VSPECS.SH, pkgLine, ctx({ branch: b, packageType: 'International', ...over }));
    expect(c('BOM').tds).toBe(100);
    expect(c('FBM').tds).toBe(0);
    expect(c('FBM', { supplierWhtRate: 10 }).tds).toBe(500);
  });
});

describe('bookingTotals threads supplierWhtRate (the ctx whitelist drops unlisted keys)', () => {
  test('Africa: po.incentiveTds is 0 without a rate, and honours one when given', () => {
    expect(bookingTotals(VSPECS.SF, [line], { branch: 'FBM', vatRate: 16 }).po.incentiveTds).toBe(0);
    expect(bookingTotals(VSPECS.SF, [line], { branch: 'FBM', vatRate: 16, supplierWhtRate: 10 }).po.incentiveTds).toBe(500);
  });

  test('India: po.incentiveTds is unchanged at 2%', () => {
    expect(bookingTotals(VSPECS.SF, [line], { branch: 'BOM' }).po.incentiveTds).toBe(100);
  });

  test('suppressing the wrong WHT does NOT disturb tax, cost or GP', () => {
    // The withholding is a Balance-Sheet asset netted against the payable at posting; it must
    // not move the purchase tax or the margin. If this fails, the gate has collateral damage.
    const before = bookingTotals(VSPECS.SF, [line], { branch: 'FBM', vatRate: 16, supplierWhtRate: 10 });
    const after = bookingTotals(VSPECS.SF, [line], { branch: 'FBM', vatRate: 16 });
    expect(after.po.gst).toBe(before.po.gst);
    expect(after.po.incentiveAmt).toBe(before.po.incentiveAmt);
    expect(after.so.total).toBe(before.so.total);
    expect(after.gp.total).toBe(before.gp.total);
  });

  test('omitting supplierWhtRate is safe for every existing caller', () => {
    // Every other bookingTotals call site passes no such key; it must default to 0 and leave
    // India — the only branch that was ever correct here — completely untouched.
    expect(isVatBranch('BOM')).toBe(false);
    const omitted = bookingTotals(VSPECS.SF, [line], { branch: 'BOM' });
    const explicit = bookingTotals(VSPECS.SF, [line], { branch: 'BOM', supplierWhtRate: 0 });
    expect(omitted.po.incentiveTds).toBe(explicit.po.incentiveTds);
    expect(omitted.po.incentiveTds).toBe(100);
  });
});
