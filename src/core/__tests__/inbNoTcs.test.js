// An INB (inter-branch) deal must NEVER show TCS on the entry screen, because the server never
// posts it: inb.service pins `tcsAmt: 0` on every INB leg ("for an INB sale net = total − IGST
// (no TCS)") and derives the INSO total from fareLines + serviceFee alone.
//
// The bug this pins: `bookingTotals` was completely INB-unaware, so the TCS 206C(1G) gate fired on
// any India seller raising an International Holiday (SH) INB deal — clientType is '' there, and
// isB2B('') is false. The screen then rendered a TCS column, a per-line TCS, an amber banner
// claiming TCS was "collected from the customer", and a headline total inflated by the TCS — for a
// deal whose "customer" is our OWN branch and whose posted total contains none of it. The books
// were right; the screen quoted a number that never posts, and the FX preview converted it.
//
// Substantively: 206C(1G) is collected from a BUYER remitting for an overseas tour. An inter-branch
// counterparty is us — there is no such buyer.
//
// This CANNOT be expressed via clientType: 'INTER BRANCH' is its own sub-group, distinct from
// 'B2B' (wiredSubGroups.PARTY), so isB2B() is false for it and TCS would still switch on. Hence a
// dedicated ctx flag.
import { VSPECS, bookingTotals, isVatBranch } from '../voucherSpecs.js';

// SH (Holiday) is the ONLY spec carrying `tcs` — the sole module that can trigger this.
const SH = VSPECS.SH;
const line = { fn: 'A', sn: 'B', base: 100000, ssvc: 2000 };
const INTL = 'International';
const ctx = (over = {}) => ({ branch: 'BOM', packageType: INTL, date: '2026-06-01', ...over });

describe('TCS 206C(1G) is never charged on an inter-branch deal', () => {
  test('SH is the only TCS-bearing spec — if that changes, this suite is under-scoped', () => {
    expect(SH.tcs).toBeTruthy();
    const withTcs = Object.entries(VSPECS).filter(([, s]) => s && s.tcs).map(([k]) => k);
    expect(withTcs).toEqual(['SH']);
  });

  test('India seller, International Holiday: a NORMAL booking still charges TCS', () => {
    // The control — proves the gate is live and this suite would catch its removal.
    const t = bookingTotals(SH, [line], ctx());
    expect(t.so.tcs).toBeGreaterThan(0);
  });

  test('the SAME deal raised INTER-BRANCH charges no TCS', () => {
    const t = bookingTotals(SH, [line], ctx({ interBranch: true }));
    expect(t.so.tcs).toBe(0);
  });

  test('the INB total is lower by exactly the TCS — the inflated headline/FX quote is gone', () => {
    const normal = bookingTotals(SH, [line], ctx());
    const inb = bookingTotals(SH, [line], ctx({ interBranch: true }));
    expect(inb.so.total).toBe(Math.round((normal.so.total - normal.so.tcs) * 100) / 100);
    expect(inb.so.total).toBeLessThan(normal.so.total);
  });

  test('suppressing TCS does NOT touch GST, GP, or the purchase leg', () => {
    // TCS is a Balance-Sheet liability that never enters the net, so removing it must move the
    // total and nothing else. If this fails, the gate is doing collateral damage.
    const normal = bookingTotals(SH, [line], ctx());
    const inb = bookingTotals(SH, [line], ctx({ interBranch: true }));
    expect(inb.so.gst).toBe(normal.so.gst);
    expect(inb.po.total).toBe(normal.po.total);
    expect(inb.po.gst).toBe(normal.po.gst);
    expect(inb.gp.total).toBe(normal.gp.total);
  });

  test('an Africa seller never had TCS anyway — the flag must not change that', () => {
    expect(isVatBranch('FBM')).toBe(true);
    expect(bookingTotals(SH, [line], ctx({ branch: 'FBM' })).so.tcs).toBe(0);
    expect(bookingTotals(SH, [line], ctx({ branch: 'FBM', interBranch: true })).so.tcs).toBe(0);
  });

  test('a zero-rated INB export ALSO drops TCS — saleZeroRated was never in the TCS gate', () => {
    // saleZeroRated zeroes the fee tax but is absent from the TCS condition, so before the fix a
    // BOM→DAR export (IGST unticked) still added TCS. interBranch is what actually covers it.
    const t = bookingTotals(SH, [line], ctx({ interBranch: true, saleZeroRated: true }));
    expect(t.so.tcs).toBe(0);
  });

  test('interBranch is NOT inferable from clientType — the reason it needs its own flag', () => {
    // 'INTER BRANCH' is a real sub-group, but isB2B() only matches /\bb2b\b/i, so it does NOT
    // suppress TCS. Anyone "fixing" this by faking a clientType would silently reintroduce it.
    const viaClientType = bookingTotals(SH, [line], ctx({ clientType: 'INTER BRANCH' }));
    expect(viaClientType.so.tcs).toBeGreaterThan(0);   // still charged — clientType can't express it
    const viaFlag = bookingTotals(SH, [line], ctx({ interBranch: true }));
    expect(viaFlag.so.tcs).toBe(0);
  });

  test('a real B2B client still suppresses TCS on a normal booking (unchanged)', () => {
    expect(bookingTotals(SH, [line], ctx({ clientType: 'B2B' })).so.tcs).toBe(0);
  });

  test('omitting interBranch behaves exactly as before — no silent change for existing callers', () => {
    // Every other bookingTotals caller passes no interBranch key; undefined must read as false.
    const explicit = bookingTotals(SH, [line], ctx({ interBranch: false }));
    const omitted = bookingTotals(SH, [line], ctx());
    expect(omitted.so.tcs).toBe(explicit.so.tcs);
    expect(omitted.so.total).toBe(explicit.so.total);
  });
});
