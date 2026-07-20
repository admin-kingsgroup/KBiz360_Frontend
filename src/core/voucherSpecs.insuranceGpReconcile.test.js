import { VSPECS, blankLine, bookingTotals } from './voucherSpecs.js';

// Locks the exact figures from the ASEGO travel-insurance voucher (BOM) that
// exposed the display bug: the PO grid showed the GROSS supplier invoice (SSC+GST)
// while the books credit the supplier NET of commission, and the GP tiles (gross,
// incl-GST) could not be reconciled with the net GP shown beneath them.
//
// bookingTotals already returns the correct NET figures — these tests pin them so
// the Insurance-only display fix in soPoGpVoucherEntry.jsx (net-payable PO total +
// Net Sales/Net Purchase GP tiles) stays faithful to the engine and the backend.
const SI = VSPECS.SI;
const insLine = (over = {}) => {
  const line = { ...blankLine(SI), fn: 'SHAH/BHAVIK MR', ...over };
  delete line.psvcGst; delete line.mkGst; delete line.svcGst; // let GST auto-compute
  return line;
};

describe('bookingTotals — Insurance SO/PO/GP reconciliation (ASEGO voucher)', () => {
  const lines = [insLine({
    markup: 1538.77,   // Service Charge - 2 (SVC2) — GST-inclusive
    ssvc: 0,           // Service Fee
    psvc: 2444.06,     // Supplier Service Charge
    incentive: 1099.83,// Supp Comm / Inc Rcvd
  })];
  const { po, so, gp } = bookingTotals(SI, lines, { noSupplier: false, branch: 'BOM' });

  test('SO side — SVC2 embeds 18% GST; total stays 1,538.77', () => {
    expect(so.total).toBe(1538.77);
    expect(so.otherTaxesGst).toBe(234.73); // GST carved out of the SVC2 margin
    expect(so.gst).toBe(0);                // no separate service fee → no regular output GST
    expect(gp.saleNet).toBe(1304.04);      // 1538.77 − 234.73
  });

  test('PO side — gross total rounds to 2,884.00; commission & TDS carried separately', () => {
    expect(po.total).toBe(2884);           // 2444.06 + 439.93 = 2883.99 → round off +0.01
    expect(po.roundOff).toBeCloseTo(0.01, 2);
    expect(po.gst).toBe(439.93);           // 2444.06 × 18%
    expect(po.incentiveAmt).toBe(1099.83);
    expect(po.incentiveTds).toBe(22);      // 1099.83 × 2% ≈ 22.00
    expect(po.incentiveGst).toBe(0);
    expect(gp.costNet).toBe(1344.23);      // 2444.06 − 1099.83 (GST is ITC, not cost)
  });

  test('GP tiles reconcile: Net Sales − Net Purchase === Gross Profit', () => {
    expect(gp.total).toBeCloseTo(-40.19, 2);
    // The invariant the fixed GP tiles rely on — they now show gp.saleNet / gp.costNet.
    expect(Math.round((gp.saleNet - gp.costNet) * 100) / 100).toBeCloseTo(gp.total, 2);
    expect(gp.pct).toBeCloseTo(-2.61, 2);
  });

  test('PO net payable mirrors backend creditorNet (what actually credits the supplier)', () => {
    // soPoGpVoucherEntry poNetPayable === posting.builder.js creditorNet(v):
    //   total − incentiveAmt − incentiveGst + incentiveTds (non-foreign supplier)
    const poNetPayable = po.total - po.incentiveAmt - po.incentiveGst + po.incentiveTds;
    expect(Math.round(poNetPayable * 100) / 100).toBe(1806.17);
  });
});
