import { VSPECS, blankLine, bookingTotals, lineCalc } from './voucherSpecs.js';

// A FOREIGN supplier (e.g. IATA-BSP / Singapore) cannot withhold Indian 194H TDS, so the
// FE grid must drop the 2% TDS on the incentive — matching the journal the backend posts
// (posting.builder zeroes the TDS leg when foreignSupplier is set). Mirrors the backend's
// foreignSupplierNoTds.test.js on the front-end calc side.
const SF = VSPECS.SF;
const flightLine = (over = {}) => {
  const line = { ...blankLine(SF), fn: 'SANATAN', sn: 'DAS', ...over };
  delete line.psvcGst; // auto-calc GST
  return line;
};

describe('bookingTotals / lineCalc — foreign supplier drops Indian TDS', () => {
  const lines = [flightLine({ base: 10000, k3: 0, tax: 0, psvc: 0, markup: 1500, ssvc: 500, incentive: 2000 })];

  test('Indian supplier (default): 2% TDS retained', () => {
    const { po } = bookingTotals(SF, lines, { branch: 'BOM' });
    expect(po.incentiveAmt).toBe(2000);
    expect(po.incentiveTds).toBe(40);          // 2000 × 2%
    expect(lineCalc(SF, lines[0], { branch: 'BOM' }).tds).toBe(40);
  });

  test('foreign supplier: TDS is zero, incentive unchanged', () => {
    const { po } = bookingTotals(SF, lines, { branch: 'BOM', foreignSupplier: true });
    expect(po.incentiveAmt).toBe(2000);        // commission still credited
    expect(po.incentiveTds).toBe(0);           // 194H dropped — foreign vendor
    expect(lineCalc(SF, lines[0], { branch: 'BOM', foreignSupplier: true }).tds).toBe(0);
  });

  test('foreign flag does not change the gross cost or GP (TDS is a B/S asset, not a cost)', () => {
    const indian = bookingTotals(SF, lines, { branch: 'BOM' });
    const foreign = bookingTotals(SF, lines, { branch: 'BOM', foreignSupplier: true });
    expect(foreign.po.total).toBe(indian.po.total);
    expect(foreign.gp.total).toBeCloseTo(indian.gp.total, 2);
  });
});
