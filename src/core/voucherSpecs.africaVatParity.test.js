// Track A cross-branch parity fixes on the FE SO/PO/GP mirror (voucherSpecs), matching
// the backend. A2 — VAT branches post at the LIVE rate threaded on ctx.vatRate (from the
// branch config / VAT master), not the frozen static map. A3 — the whole-unit invoice
// round-off is a rupee (INR) convention; a USD-book (Africa) branch bills to the cent.
import { VSPECS, bookingTotals } from './voucherSpecs';

const SF = VSPECS.SF;

describe('A2 FE — VAT booking honours the live ctx rate', () => {
  const line = { base: 1000, k3: 0, tax: 0, ssvc: 100, markup: 0, psvc: 0 };

  test('no ctx.vatRate → NBO falls back to the seeded 16%', () => {
    expect(bookingTotals(SF, [line], { branch: 'NBO' }).so.gst).toBeCloseTo(16, 2); // 100 * 16%
  });

  test('a live vatRate override (20%) flows into the on-screen math', () => {
    expect(bookingTotals(SF, [line], { branch: 'NBO', vatRate: 20 }).so.gst).toBeCloseTo(20, 2); // 100 * 20%
    // A different branch rate is honoured too (DAR 18 explicit).
    expect(bookingTotals(SF, [line], { branch: 'DAR', vatRate: 18 }).so.gst).toBeCloseTo(18, 2);
  });
});

describe('A3 FE — round-off snap is INR-only (USD bills to the cent)', () => {
  const line = { base: 500, k3: 0, tax: 0, ssvc: 0.01, markup: 0, psvc: 0 };

  test('India (BOM, INR) still snaps the whole-rupee residue', () => {
    const bom = bookingTotals(SF, [line], { branch: 'BOM' });
    expect(bom.so.total).toBe(500);
    expect(bom.so.roundOff).toBe(-0.01);
  });

  test('Africa (NBO, USD) keeps the cents — no snap', () => {
    const nbo = bookingTotals(SF, [line], { branch: 'NBO' });
    expect(nbo.so.total).toBe(500.01);
    expect(nbo.so.roundOff).toBe(0);
  });
});
