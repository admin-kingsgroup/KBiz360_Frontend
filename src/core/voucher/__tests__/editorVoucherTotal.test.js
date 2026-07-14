// The accountingLive voucher editor recomputes the bill total from the form. The
// party leg the posting engine debits/credits is the FULL value, so the total MUST
// carry every component that posts to the books — including the SVC2 margin GST
// (otherTaxesGst), which lands in its own per-branch Output head. Forgetting it made
// every SVC2-bearing sale read "✗ Out by <SVC2 GST>" and blocked the edit from saving,
// even though the saved journal was balanced. This guards the formula.
import { editorVoucherTotal } from '../ui';

describe('editorVoucherTotal — SVC2 GST must ride inside the bill total', () => {
  test('real migrated SF sale BOM/0626/SF00794 balances (was out by ₹8)', () => {
    // subtotal 38,057.37 + GST 90 + SVC2 GST 7.63 = 38,155 (the stored, balanced total).
    const total = editorVoucherTotal({ subtotal: 38057.37, taxAmt: 90, otherTaxesGst: 7.63, tcsAmt: 0 });
    expect(total).toBe(38155);
    // The credit side the engine posts = lines + GST + SVC2 GST; debit (customer) = total.
    const creditSide = 38057.37 + 90 + 7.63;
    expect(total).toBeCloseTo(creditSide, 2); // balanced, no "out by"
  });

  test('omitting otherTaxesGst reproduces the old ₹8 shortfall (regression marker)', () => {
    const buggy = editorVoucherTotal({ subtotal: 38057.37, taxAmt: 90, tcsAmt: 0 }); // no SVC2 GST
    const fixed = editorVoucherTotal({ subtotal: 38057.37, taxAmt: 90, otherTaxesGst: 7.63, tcsAmt: 0 });
    expect(fixed - buggy).toBeCloseTo(7.63, 2); // the exact gap that showed as "Out by ₹-8"
  });

  test('TCS still rides inside the total alongside SVC2 GST', () => {
    const total = editorVoucherTotal({ subtotal: 1000, taxAmt: 180, otherTaxesGst: 18, tcsAmt: 50 });
    expect(total).toBe(1248);
  });

  test('a plain sale with no SVC2 GST is unaffected (subtotal + tax)', () => {
    expect(editorVoucherTotal({ subtotal: 46194, taxAmt: 90 })).toBe(46284);
  });

  test('SO/PO/GP round-off rides inside the total so it foots to the snapped rupee', () => {
    // supplier svc 84.75 + GST 15.26 = 100.01 → purchase snapped to 7,100.00, roundOff -0.01.
    const total = editorVoucherTotal({ subtotal: 7084.75, taxAmt: 15.26, otherTaxesGst: 0, tcsAmt: 0, roundOff: -0.01 });
    expect(total).toBe(7100);
    // Without carrying roundOff the editor would read the un-rounded 7,100.01 → "✗ Out by ₹0.01".
    expect(editorVoucherTotal({ subtotal: 7084.75, taxAmt: 15.26 })).toBe(7100.01);
  });

  test('blank / missing fields default to 0, never NaN', () => {
    expect(editorVoucherTotal({})).toBe(0);
    expect(editorVoucherTotal()).toBe(0);
    expect(editorVoucherTotal({ subtotal: '500', taxAmt: '', otherTaxesGst: null })).toBe(500);
  });
});
