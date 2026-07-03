// billDuesSummary — the party-dues strip on the Bill-wise Allocation panel.
// "Overdue as on <voucher date>" = outstanding of bills whose due date (bill
// date + credit days) falls on/before the voucher date; "after this" nets the
// voucher amount; totalOpen sums everything. Modelled on the real case that
// motivated it: receipt RV/BOM/26/0123 (₹6,35,734 dated 2026-04-16) against
// NeuIQ, whose bills due by that date left ₹3,06,842 still overdue.
import { billDuesSummary } from '../ui';

const B = (date, outstanding, creditDays = 0) => ({ date, outstanding, creditDays });

describe('billDuesSummary', () => {
  test('overdue as on the voucher date nets the voucher amount (NeuIQ receipt case)', () => {
    const bills = [
      // Due on/before the receipt date 2026-04-16 → 9,42,576.24 overdue
      B('2026-03-06', 0.24), B('2026-03-09', 163745), B('2026-03-09', 172375),
      B('2026-03-09', 355637), B('2026-03-11', 137145), B('2026-03-11', 111089),
      B('2026-03-16', 2584), B('2026-04-16', 1),
      // Billed later — open but NOT yet due on 2026-04-16
      B('2026-04-28', 234275), B('2026-05-02', 276275),
    ];
    const d = billDuesSummary(bills, '2026-04-16', 635734);
    expect(d.overdueAsOn).toBe(942576.24);
    expect(d.overdueAfter).toBe(306842.24); // ≈ the "3,06,841" the accountant expects to see
    expect(d.totalOpen).toBe(1453126.24);
  });

  test('credit days push a bill past the voucher date (not yet overdue)', () => {
    const d = billDuesSummary([B('2026-04-10', 1000, 30), B('2026-04-01', 500, 7)], '2026-04-16', 0);
    expect(d.overdueAsOn).toBe(500);   // due 2026-04-08 — overdue
    expect(d.totalOpen).toBe(1500);    // the 30-day bill is open but due only on 2026-05-10
  });

  test('voucher amount larger than the overdue clamps to zero, never negative', () => {
    const d = billDuesSummary([B('2026-01-01', 300)], '2026-04-16', 1000);
    expect(d.overdueAfter).toBe(0);
  });

  test('empty / missing bills are all-zero', () => {
    expect(billDuesSummary([], '2026-04-16', 100)).toEqual({ overdueAsOn: 0, overdueAfter: 0, totalOpen: 0 });
    expect(billDuesSummary(undefined, '2026-04-16', 100)).toEqual({ overdueAsOn: 0, overdueAfter: 0, totalOpen: 0 });
  });
});
