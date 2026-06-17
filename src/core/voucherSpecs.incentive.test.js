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

    // Fares = 10000
    // psvc = 1000
    // gstPur = 1000 * 18% = 180
    // incentive = 2000
    // tds = 2000 * 2% = 40
    // finalPurchase = 10000 + 1000 + 180 - 2000 + 40 = 9220
    expect(po.total).toBe(9220);
    expect(po.incentive).toBe(2000);
    expect(po.tds).toBe(40);
    expect(po.gst).toBe(180);

    // Sales side
    // Fares = 10000
    // markup = 1500
    // ssvc = 500
    // gstSvc = 500 * 18% = 90
    // gstMk = 1500 * 18 / 118 = 228.81
    // finalSales = 10000 + 1500 + 500 + 90 = 12090
    expect(so.total).toBe(12090);

    // Net Sales = 12090 - gstSvc - gstMk = 12090 - 90 - 228.81 = 11771.19
    // Net Cost = po.total - gstPur - tds = 9220 - 180 - 40 = 9000
    // (Fares + psvc - incentive = 10000 + 1000 - 2000 = 9000)
    // GP = Net Sales - Net Cost = 11771.19 - 9000 = 2771.19
    expect(gp.costNet).toBe(9000);
    expect(gp.total).toBeCloseTo(2771.19, 2);

    // Verify heads
    const incHead = po.heads.find((h) => h.label === 'Supplier Incentive');
    expect(incHead).toBeTruthy();
    expect(incHead.amt).toBe(-2000);

    const tdsHead = po.heads.find((h) => h.label === 'TDS Receivable');
    expect(tdsHead).toBeTruthy();
    expect(tdsHead.amt).toBe(40);
  });
});
