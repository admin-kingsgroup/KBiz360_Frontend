// Regression: switching the SO/PO/GP Voucher module to a REVERSAL module (Refund RF /
// Reissue RI) crashed the screen with "Cannot read properties of undefined (reading
// 'idCols')". Reversal modules have NO fare-grid spec, so VSPECS['RF'] is undefined and
// the module-change effect called blankLine(undefined). blankLine now guards a missing
// spec (returns an empty line) so the reversal UI renders instead of throwing.
import { VSPECS, blankLine } from '../voucherSpecs.js';

describe('blankLine — missing spec (reversal module) is safe', () => {
  test('reversal module codes have no fare-grid spec', () => {
    expect(VSPECS.RF).toBeUndefined();
    expect(VSPECS.RI).toBeUndefined();
  });

  test('blankLine(VSPECS["RF"]) does not throw and yields an empty line', () => {
    expect(() => blankLine(VSPECS.RF)).not.toThrow();
    expect(blankLine(VSPECS.RF)).toEqual({});
    expect(blankLine(undefined)).toEqual({});
  });

  test('blankLine for a real module still seeds id + fare + adjustment fields', () => {
    const l = blankLine(VSPECS.SF);
    // every id / fare column is present and blank, adjustment fields initialised
    expect(l).toHaveProperty('fn', '');
    expect(l).toHaveProperty('sn', '');
    expect(l).toHaveProperty('base', '');
    expect(l).toHaveProperty('markup', '');
    // Flight is a sector module → sectors[] seeded
    expect(Array.isArray(l.sectors)).toBe(true);
    expect(l.sectors.length).toBe(1);
  });
});
