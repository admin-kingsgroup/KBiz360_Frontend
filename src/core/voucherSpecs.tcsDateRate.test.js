// TCS u/s 206C(1G) rate is date-driven: 5% on overseas tour packages booked up to
// 31-03-2026, 2% from 01-04-2026 (Finance Act cut). The rate follows the BOOKING
// date so a revoke → re-adjust → re-approve of a pre-cutover booking keeps 5%,
// while the current default (no/blank date, or on/after the cutover) stays 2%.
// Pure, DB-free unit tests. Figures reuse the LK/BOM/00760 fixture.
import { VSPECS, blankLine, bookingTotals, tcs206cRate, TCS_206C_CUTOVER } from './voucherSpecs.js';

const SH = VSPECS.SH;
const pkgLine = (over = {}) => ({
  ...blankLine(SH), fn: 'REKHA', sn: 'THAKKAR', pkg: 'Thailand',
  base: 32520, psvc: 0, psvcGst: 1626, markup: 4921.64, ...over,
});
const CTX = { packageType: 'International', branch: 'BOM' };

describe('tcs206cRate — statutory rate by booking date', () => {
  test('cutover constant is 01-04-2026', () => {
    expect(TCS_206C_CUTOVER).toBe('2026-04-01');
  });
  test('5% up to 31-03-2026, 2% from 01-04-2026', () => {
    expect(tcs206cRate(SH, '2026-02-23')).toBe(5);   // this voucher's date
    expect(tcs206cRate(SH, '2026-03-31')).toBe(5);   // last 5% day
    expect(tcs206cRate(SH, '2026-04-01')).toBe(2);   // first 2% day
    expect(tcs206cRate(SH, '2027-01-01')).toBe(2);
  });
  test('blank/missing date falls back to the module default (2%)', () => {
    expect(tcs206cRate(SH, '')).toBe(2);
    expect(tcs206cRate(SH, undefined)).toBe(2);
  });
});

describe('bookingTotals — TCS on an International holiday follows the date', () => {
  const preNet = 39313.72;  // Base 32,520 + SVC2 4,921.64 + 5% GST

  test('pre-cutover booking (2026-02-23) collects TCS @ 5%', () => {
    const so = bookingTotals(SH, [pkgLine()], { ...CTX, date: '2026-02-23' }).so;
    expect(so.tcs).toBeCloseTo(1965.69, 2);          // 5% × 39,313.72
    // so.total = net + GST + TCS, snapped to a whole rupee when within 5p (residue → roundOff).
    expect(so.total).toBeCloseTo(preNet + 1965.69 + so.roundOff, 2);
  });

  test('post-cutover booking (2026-04-15) collects TCS @ 2%', () => {
    const so = bookingTotals(SH, [pkgLine()], { ...CTX, date: '2026-04-15' }).so;
    expect(so.tcs).toBeCloseTo(786.27, 2);           // 2% × 39,313.72
    expect(so.total).toBeCloseTo(preNet + 786.27 + so.roundOff, 2);
  });

  test('no date passed → unchanged legacy behaviour (2%)', () => {
    const so = bookingTotals(SH, [pkgLine()], CTX).so;
    expect(so.tcs).toBeCloseTo(786.27, 2);
  });

  test('B2B stays TCS-exempt regardless of date', () => {
    const so = bookingTotals(SH, [pkgLine()], { ...CTX, date: '2026-02-23', clientType: 'B2B' }).so;
    expect(so.tcs).toBeCloseTo(0, 2);
  });
});
