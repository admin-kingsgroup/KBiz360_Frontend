// Voucher-activity transforms — pure functions that turn the LIVE /api/vouchers
// feed into the SR-AE "Today's Voucher Volume" table and the Accts-Exec "Recent
// Activity" feed. Regression guard that these read real vouchers, not seed arrays.
import { tallyVouchersByBranch, vouchersToActivity } from '../utils/transformers';

describe('tallyVouchersByBranch — today receipt/payment/journal counts per branch', () => {
  test('groups the three cash categories by branch; ignores sale/purchase', () => {
    const out = tallyVouchersByBranch([
      { category: 'receipt', branch: 'BOM' },
      { category: 'receipt', branch: 'BOM' },
      { category: 'payment', branch: 'BOM' },
      { category: 'journal', branch: 'NBO' },
      { category: 'sale', branch: 'BOM' },      // not a cash voucher → ignored
      { category: 'purchase', branch: 'NBO' },  // ignored
    ]);
    expect(out.BOM).toEqual({ receipt: 2, payment: 1, journal: 0 });
    expect(out.NBO).toEqual({ receipt: 0, payment: 0, journal: 1 });
  });

  test('empty / undefined input → empty object (no fabricated branches)', () => {
    expect(tallyVouchersByBranch([])).toEqual({});
    expect(tallyVouchersByBranch()).toEqual({});
  });
});

describe('vouchersToActivity — latest vouchers mapped to the feed shape', () => {
  test('sorts newest-first, caps at the limit, maps action/amount/vendor/ts', () => {
    const feed = vouchersToActivity([
      { category: 'receipt', vno: 'RC/1', total: 1000, party: 'Acme', date: '2026-06-20' },
      { category: 'payment', vno: 'PM/9', total: 500, party: 'Globex', date: '2026-06-22' },
    ]);
    expect(feed[0]).toEqual({ action: 'Payment PM/9', amount: 500, vendor: 'Globex', ts: '2026-06-22' });
    expect(feed[1]).toEqual({ action: 'Receipt RC/1', amount: 1000, vendor: 'Acme', ts: '2026-06-20' });
  });

  test('respects the limit', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ category: 'journal', vno: `JV/${i}`, total: i, date: `2026-06-${10 + i}` }));
    expect(vouchersToActivity(rows, 8)).toHaveLength(8);
  });

  test('empty input → empty feed (no ghost activity)', () => {
    expect(vouchersToActivity([])).toEqual([]);
    expect(vouchersToActivity()).toEqual([]);
  });
});
