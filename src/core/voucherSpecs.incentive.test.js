import { VSPECS, blankLine, bookingTotals } from './voucherSpecs.js';

const SF = VSPECS.SF;
const flightLine = (over = {}) => {
  const line = { ...blankLine(SF), fn: 'KUNAL', sn: 'CHAUHAN', ...over };
  delete line.psvcGst; // delete so that it auto-calculates GST instead of overriding to 0
  return line;
};

describe('bookingTotals — Supplier Incentive and TDS', () => {
  test('correctly reduces net cost and increases GP by incentive, calculates 2% TDS', () => {
    const lines = [
      flightLine({
        base: 10000,
        k3: 0,
        tax: 0,
        psvc: 1000,
        markup: 1500,
        ssvc: 500,
        incentive: 2000, // 2000 incentive
      }),
    ];

    const { po, so, gp } = bookingTotals(SF, lines, { noSupplier: false, branch: 'BOM' });

    // GROSS convention (mirrors the backend): the commission + 2% TDS are carried
    // separately on po.incentiveAmt / po.incentiveTds and post via the engine's
    // incentivePostings — NOT baked into the cost. So:
    //   po.total = fares 10000 + psvc 1000 + gstPur 180 = 11180  (GROSS, ex-commission)
    expect(po.total).toBe(11180);
    expect(po.incentiveAmt).toBe(2000);
    expect(po.incentiveTds).toBe(40);          // 2000 × 2%
    expect(po.incentiveGst).toBe(0);           // trade-discount policy
    expect(po.gst).toBe(180);

    // Sales side unchanged: finalSales = 10000 + 1500 + 500 + 90 = 12090
    expect(so.total).toBe(12090);

    // GP credits the commission: Net Sales 11771.19 − (Fares+psvc − incentive = 9000)
    expect(gp.costNet).toBe(9000);             // cost net of the commission credit
    expect(gp.total).toBeCloseTo(2771.19, 2);

    // The commission/TDS are NOT cost heads anymore — heads are gross cost only.
    expect(po.heads.find((h) => h.label === 'Supplier Incentive')).toBeFalsy();
    expect(po.heads.find((h) => h.label === 'TDS Receivable')).toBeFalsy();
    expect(po.heads.reduce((s, h) => s + h.amt, 0)).toBeCloseTo(11000, 2); // base 10000 + psvc 1000
  });
});
