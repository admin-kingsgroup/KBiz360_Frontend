// allocSummary with adjust-credit (negative) entries — an Overpaid bill's excess
// drawn down to settle other bills. Net allocated (positives + negatives) is what
// caps at the voucher amount; the freed credit adds settling capacity.
// Real case: receipt ₹6,35,734 + SF00838's ₹3,06,841 Overpaid credit clears
// ₹9,42,575 of NeuIQ's bills exactly.
import { allocSummary } from '../ui';

describe('allocSummary — adjust-credit entries', () => {
  test('credit + receipt together clear more than the receipt amount (net = amount → valid)', () => {
    const alloc = { 'SF00838': -306841, 'SF00648': 163745, 'SF00651': 172375, 'SHT00021': 355637, 'SF00639': 137145, 'SHT00020': 111089, 'SI00012': 2584, 'SF01066': 0.24, 'JV1370': 0 };
    const s = allocSummary(alloc, 635734.24, false, 'bills');
    expect(s.allocated).toBe(635734.24); // net: 9,42,575.24 to bills − 3,06,841 credit
    expect(s.un).toBe(0);
    expect(s.valid).toBe(true);
  });

  test('positive rows exceeding amount + credit stay invalid', () => {
    const s = allocSummary({ A: 1000, OP: -100 }, 500, false, 'bills'); // net 900 > 500
    expect(s.valid).toBe(false);
  });

  test('credit-only entry needs Park On Account (frees the credit into this voucher)', () => {
    const no = allocSummary({ OP: -306841 }, 635734, false, 'bills');
    expect(no.valid).toBe(false); // unallocated remainder not parked
    const yes = allocSummary({ OP: -306841 }, 635734, true, 'bills');
    expect(yes.valid).toBe(true);
    expect(yes.onAcc).toBe(942575); // voucher amount + freed credit held on account
  });

  test('zero-value entries still do not validate', () => {
    expect(allocSummary({ A: 0 }, 100, false, 'bills').valid).toBe(false);
  });
});
