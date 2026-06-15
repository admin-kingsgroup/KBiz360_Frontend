// Regression: editing a PENDING SO/PO/GP voucher that was bulk-imported / migrated
// WITHOUT the per-line `rows` grid used to open the Edit form blank — every figure
// on the voucher "disappeared". rowsFromSnapshots rebuilds the editable grid from
// the so/po snapshots so the values are shown and the totals round-trip on save.
import { VSPECS, bookingTotals, rowsFromSnapshots } from '../voucherSpecs.js';

const CTX = { branch: 'BOM' }; // India branch, no VAT → per-module GST rule

// A booking as it sits in the DB after a summary import: so/po/gp snapshots present,
// but `rows` (the full per-line grid) empty.
function importedBooking(spec, lines) {
  const t = bookingTotals(spec, lines, CTX);
  return { module: spec.code, rows: [], so: t.so, po: t.po, gp: t.gp };
}

describe('rowsFromSnapshots — rebuild edit grid for rows-less bookings', () => {
  test('Hotel (multi-line): grid is recovered and totals round-trip', () => {
    const spec = VSPECS.SHT;
    const orig = [
      { fn: 'PRIYA', sn: 'NAIR', htl: 'Taj', conf: 'HT1', base: 18000, tax: 900, psvc: 500, markup: 2000, ssvc: 300 },
      { fn: 'RAVI', sn: 'KUMAR', htl: 'Hyatt', conf: 'HT2', base: 12000, tax: 600, psvc: 300, markup: 1500, ssvc: 200 },
    ];
    const before = bookingTotals(spec, orig, CTX);
    const booking = importedBooking(spec, orig);

    const rebuilt = rowsFromSnapshots(booking);
    expect(rebuilt).toHaveLength(2); // not blank

    // The money-bearing fields are recovered line-for-line.
    expect(rebuilt[0]).toMatchObject({ base: 18000, tax: 900, psvc: 500, markup: 2000, ssvc: 300 });
    expect(rebuilt[1]).toMatchObject({ base: 12000, tax: 600, psvc: 300, markup: 1500, ssvc: 200 });

    // Re-saving (recomputes totals from the grid) reproduces the original snapshot.
    const after = bookingTotals(spec, rebuilt, CTX);
    expect(after.so.total).toBeCloseTo(before.so.total, 2);
    expect(after.po.total).toBeCloseTo(before.po.total, 2);
    expect(after.gp.total).toBeCloseTo(before.gp.total, 2);
    expect(after.so.gst).toBeCloseTo(before.so.gst, 2);
    expect(after.po.gst).toBeCloseTo(before.po.gst, 2);
  });

  test('Insurance (tax on whole cost): supplier service is recovered from po side', () => {
    const spec = VSPECS.SI; // tax.kind === 'all'
    const orig = [{ fn: 'SARA', sn: 'KHAN', plan: 'S30', pol: 'INS1', base: 1800, tax: 0, psvc: 120, markup: 400, ssvc: 100 }];
    const before = bookingTotals(spec, orig, CTX);
    const rebuilt = rowsFromSnapshots(importedBooking(spec, orig));

    expect(rebuilt).toHaveLength(1);
    expect(rebuilt[0].psvc).toBe(120);   // came from po.lines, not so.lines
    expect(rebuilt[0].markup).toBe(400); // came from so.lines

    const after = bookingTotals(spec, rebuilt, CTX);
    expect(after.po.total).toBeCloseTo(before.po.total, 2);
    expect(after.so.total).toBeCloseTo(before.so.total, 2);
  });

  test('no per-line detail anywhere → returns [] (caller falls back to a blank line)', () => {
    expect(rowsFromSnapshots({ rows: [], so: {}, po: {} })).toEqual([]);
    expect(rowsFromSnapshots({})).toEqual([]);
    expect(rowsFromSnapshots(null)).toEqual([]);
  });
});
