// No-supplier (Misc) SO/PO/GP scenario — a sale with NO purchase leg (we sell but
// don't buy: extra seats / services). The full sale value is income, GP = 100%,
// and nothing posts to the cost side. Pure, DB-free unit tests.
import { VSPECS, blankLine, bookingTotals } from './voucherSpecs.js';

const SM = VSPECS.SM;
const miscLine = (over = {}) => ({ ...blankLine(SM), fn: 'NEHA', sn: 'JOSHI', svc: 'Seat upgrade', ...over });

describe('bookingTotals — no-supplier Misc (sell without buying)', () => {
  test('zeroes the purchase side and routes the whole sale net to GP', () => {
    const lines = [miscLine({ base: 5000, tax: 0 })];
    const { po, so, gp } = bookingTotals(SM, lines, { noSupplier: true });

    // No cost leg at all.
    expect(po.total).toBe(0);
    expect(po.lineTotal).toBe(0);
    expect(po.gst).toBe(0);
    expect(po.lines).toEqual([]);
    expect(po.heads).toEqual([]);

    // Sale is the entered amount (no GST when there's no markup/service charge).
    expect(so.total).toBe(5000);

    // GP = full sale net, 100% margin, against zero cost.
    expect(gp.total).toBe(5000);
    expect(gp.costNet).toBe(0);
    expect(gp.saleNet).toBe(5000);
    expect(gp.pct).toBe(100);
  });

  test('still posts the sale heads (so the JV balances against the customer)', () => {
    const lines = [miscLine({ base: 5000 })];
    const { so } = bookingTotals(SM, lines, { noSupplier: true });
    const basic = so.heads.find((h) => h.label === 'Basic');
    expect(basic).toBeTruthy();
    expect(basic.amt).toBe(5000);
    // Sale heads must foot to the sale net.
    const headSum = so.heads.reduce((s, h) => s + h.amt, 0);
    expect(Math.round(headSum)).toBe(Math.round(so.total - so.gst - so.tcs));
  });

  test('markup + service charge still flow into the sale, all of it profit', () => {
    const lines = [miscLine({ base: 1000, markup: 236, ssvc: 100 })];
    const { po, gp } = bookingTotals(SM, lines, { noSupplier: true });
    expect(po.total).toBe(0);
    // With no cost, GP equals the entire sale net.
    expect(gp.total).toBe(gp.saleNet);
    expect(gp.costNet).toBe(0);
  });

  test('the SAME line WITH a supplier mirrors the cost → GP collapses to the margin only', () => {
    const lines = [miscLine({ base: 5000, tax: 0 })];
    const withSupp = bookingTotals(SM, lines, { noSupplier: false });
    // base is a pass-through cost mirrored on both sides → purchase = sale, GP = 0.
    expect(withSupp.po.total).toBe(5000);
    expect(withSupp.gp.total).toBe(0);
    // Confirms the flag is exactly what turns the cost leg off.
    const noSupp = bookingTotals(SM, lines, { noSupplier: true });
    expect(noSupp.gp.total).toBe(5000);
  });
});
