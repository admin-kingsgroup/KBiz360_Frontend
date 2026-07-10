import { toVoucherRegisterRow } from '../utils/transformers';

// The voucher register's amount column (and its footer sum) must foot to the actual
// cash/bank outflow. A supplier payment with ADDITIVE charge legs (bank charge etc.)
// keeps voucher.total = the supplier amount, so the row must add the charge legs back.
describe('toVoucherRegisterRow — additive charge legs on a supplier payment', () => {
  test('plain supplier payment (no lines) → amount = total', () => {
    const r = toVoucherRegisterRow({ category: 'payment', party: 'TRIP JACK', total: 10000, lines: [] });
    expect(r.amount).toBe(10000);
  });

  test('supplier payment + charge leg → amount = total + charges (foots to bank outflow)', () => {
    const r = toVoucherRegisterRow({ category: 'payment', party: 'TRIP JACK', total: 10000,
      lines: [{ ledger: 'Bank Charges', drCr: 'Dr', amt: 50 }] });
    expect(r.amount).toBe(10050);
  });

  test('two charge legs are both added', () => {
    const r = toVoucherRegisterRow({ category: 'payment', party: 'TRIP JACK', total: 10000,
      lines: [{ ledger: 'Bank Charges', drCr: 'Dr', amt: 50 }, { ledger: 'Courier', drCr: 'Dr', amt: 30 }] });
    expect(r.amount).toBe(10080);
  });

  test('legacy party payment stored as Dr party + Cr bank (a Cr line) → charges ignored, amount = total', () => {
    const r = toVoucherRegisterRow({ category: 'payment', party: 'ARIKA', total: 347,
      lines: [{ ledger: 'ARIKA', drCr: 'Dr', amt: 347 }, { ledger: 'ICICI Bank', drCr: 'Cr', amt: 347 }] });
    expect(r.amount).toBe(347);
  });

  test('split payment (no party) → charge sum 0, amount = total', () => {
    const r = toVoucherRegisterRow({ category: 'payment', party: '', total: 8000,
      lines: [{ ledger: 'Office Rent', drCr: 'Dr', amt: 5000 }, { ledger: 'Electricity', drCr: 'Dr', amt: 3000 }, { ledger: 'ICICI', drCr: 'Cr', amt: 8000 }] });
    expect(r.amount).toBe(8000);
  });

  test('a receipt with lines is never treated as having charge legs', () => {
    const r = toVoucherRegisterRow({ category: 'receipt', party: 'Cust', total: 5000,
      lines: [{ ledger: 'Bank Charges', drCr: 'Dr', amt: 50 }] });
    expect(r.amount).toBe(5000);
  });

  test('refund partyNet still wins over total (+charges never apply — no lines)', () => {
    const r = toVoucherRegisterRow({ category: 'refund', partyNet: 4200, total: 5000, lines: [] });
    expect(r.amount).toBe(4200);
  });
});
