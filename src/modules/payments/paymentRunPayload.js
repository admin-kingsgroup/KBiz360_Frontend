/* Build the /api/vouchers/payment-run payload from the selected, editable bill
 * rows on the Payment Run screen. Pure (no imports) so it's unit-testable.
 * A row is { party, billVno, billId, outstanding, amount, selected }. Only
 * selected rows with a positive amount are paid; amount is clamped to outstanding. */
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function buildPaymentRunPayload(rows = []) {
  return (rows || [])
    .filter((r) => r && r.selected && Number(r.amount) > 0)
    .map((r) => ({
      supplier: r.party,
      billVno: r.billVno || '',
      billId: r.billId || '',
      amount: Math.min(r2(r.amount), r2(r.outstanding)),
    }));
}

/** Summary of a payment-run selection: distinct suppliers + total to pay. */
export function paymentRunSummary(rows = []) {
  const payments = buildPaymentRunPayload(rows);
  const suppliers = new Set(payments.map((p) => p.supplier));
  return {
    bills: payments.length,
    suppliers: suppliers.size,
    total: r2(payments.reduce((s, p) => s + p.amount, 0)),
  };
}
