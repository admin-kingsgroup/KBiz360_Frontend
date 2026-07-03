/* Feature 4 — Payment Run payload builder + selection summary. */
import { buildPaymentRunPayload, paymentRunSummary } from '../modules/payments/paymentRunPayload';

const rows = [
  { party: 'Akbar Travels', billVno: 'PUR-1', billId: 'b1', outstanding: 600, amount: 600, selected: true },
  { party: 'Akbar Travels', billVno: 'PUR-2', billId: 'b2', outstanding: 400, amount: 400, selected: true },
  { party: 'TBO', billVno: 'PUR-9', billId: 'b9', outstanding: 250, amount: 250, selected: false }, // not selected
  { party: 'Yatra', billVno: 'PUR-7', billId: 'b7', outstanding: 100, amount: 0, selected: true },  // zero amount
];

describe('buildPaymentRunPayload', () => {
  test('includes only selected rows with a positive amount', () => {
    const out = buildPaymentRunPayload(rows);
    expect(out).toHaveLength(2);
    expect(out.map((p) => p.billVno)).toEqual(['PUR-1', 'PUR-2']);
    expect(out[0]).toEqual({ supplier: 'Akbar Travels', billVno: 'PUR-1', billId: 'b1', amount: 600 });
  });

  test('clamps an over-payment to the outstanding amount', () => {
    const out = buildPaymentRunPayload([{ party: 'TBO', billVno: 'P1', billId: 'x', outstanding: 250, amount: 999, selected: true }]);
    expect(out[0].amount).toBe(250);
  });

  test('allows a partial payment below outstanding', () => {
    const out = buildPaymentRunPayload([{ party: 'TBO', billVno: 'P1', billId: 'x', outstanding: 250, amount: 100, selected: true }]);
    expect(out[0].amount).toBe(100);
  });
});

describe('paymentRunSummary', () => {
  test('counts distinct suppliers, bills and total', () => {
    expect(paymentRunSummary(rows)).toEqual({ bills: 2, suppliers: 1, total: 1000 });
  });

  test('empty selection → zeros', () => {
    expect(paymentRunSummary([])).toEqual({ bills: 0, suppliers: 0, total: 0 });
  });
});
