// Holiday (SH) tour-operator package — corrected model (2026-06-29):
//   • Supplier Service GST is NOT on the sales side and is NOT a cost — it is always
//     claimed as Input GST (ITC) on the purchase.
//   • Output GST 5% applies to (Base Fare + Supplier Service + SVC2) only.
//   • TCS @2% (Intl) on the corrected base (excludes supplier GST).
//   • GP = SVC2 margin, unchanged.
// Figures mirror the real booking LK/BOM/00760. Pure, DB-free unit tests.
import { VSPECS, blankLine, bookingTotals } from './voucherSpecs.js';
import { buildBookingInvoice } from './invoiceHtml.js';

const SH = VSPECS.SH;
const pkgLine = (over = {}) => ({
  ...blankLine(SH), fn: 'REKHA', sn: 'THAKKAR', pkg: 'Thailand',
  base: 32520, psvc: 0, psvcGst: 1626, markup: 4921.64, ...over,
});
const headAmt = (heads, key) => (heads.find((h) => h.key === key) || {}).amt;

describe('Holiday package — corrected SO/PO/GP (supplier GST → ITC, off the sale)', () => {
  const { po, so, gp } = bookingTotals(SH, [pkgLine()], { packageType: 'International', branch: 'BOM' });

  test('the package GST rate is 5%, never 18%', () => {
    expect(SH.gstRate * 100).toBe(5);
    expect(SH.gstRate * 100).not.toBe(18);
  });

  test('SO: supplier GST removed, GST 5% on Base+SVC2, TCS on corrected base', () => {
    expect(so.lineTotal).toBeCloseTo(37441.64, 2);   // Base 32,520 + SVC2 4,921.64
    expect(so.gst).toBeCloseTo(1626.00, 2);          // 5% × 32,520 (base only — not supplier GST)
    expect(so.otherTaxesGst).toBeCloseTo(246.08, 2); // 5% × SVC2
    expect(so.tcs).toBeCloseTo(786.27, 2);           // 2% × 39,313.72
    expect(so.total).toBeCloseTo(40099.99, 2);
    // No "Supplier Service GST" head on the sales side anymore.
    expect(headAmt(so.heads, 'psvcGst')).toBeUndefined();
    expect(headAmt(so.heads, 'base')).toBeCloseTo(32520, 2);
    expect(headAmt(so.heads, 'markup')).toBeCloseTo(4921.64, 2);
  });

  test('PO: supplier 5% GST claimed as Input (ITC), not a cost head', () => {
    expect(po.gst).toBeCloseTo(1626, 2);             // ITC, always (no availItc toggle)
    expect(po.lineTotal).toBeCloseTo(32520, 2);      // net cost = land only
    expect(po.total).toBeCloseTo(34146, 2);          // gross payable to supplier unchanged
    expect(headAmt(po.heads, 'psvcGst')).toBeUndefined();
    expect(headAmt(po.heads, 'base')).toBeCloseTo(32520, 2);
  });

  test('GP stays the full SVC2 margin', () => {
    expect(gp.total).toBeCloseTo(4921.64, 2);
    expect(gp.saleNet).toBeCloseTo(37441.64, 2);
    expect(gp.costNet).toBeCloseTo(32520, 2);
  });
});

describe('Holiday client invoice — SVC2 hidden, SVC2 GST folded into GST', () => {
  const booking = {
    module: 'SH', branch: 'BOM', gstMode: 'intra', saleVno: 'BOM/0626/SH00005',
    rows: [pkgLine()],
    so: bookingTotals(SH, [pkgLine()], { packageType: 'International', branch: 'BOM' }).so,
  };
  const html = buildBookingInvoice(booking, 'sale');

  test('does not expose SVC2 / Service Charge - 2 to the client', () => {
    expect(html).not.toMatch(/Service Charge - 2/);
    expect(html).not.toMatch(/SVC2/);
  });

  test('shows one combined GST and the corrected NET TOTAL', () => {
    expect(html).toContain('40,099.99');   // net total
    expect(html).not.toMatch(/SVC2 CGST/);
  });
});
