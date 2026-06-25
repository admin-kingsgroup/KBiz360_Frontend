// Verifies the Trial Balance is fully LIVE-wired: the service must read the real
// backend envelope (GET /api/accounting/trial-balance), normalise every row to the
// 6-column shape, map the server grand totals (totalClosing* → grandClosing*) and
// derive `balanced` from the FULL set — never from seed data.
jest.mock('../api', () => ({ getTrialBalance: jest.fn(), getVouchers: jest.fn() }));

import * as api from '../api';
import { loadTrialBalance } from '../services/finance.service';
import { normalizeTrialBalanceRow, trialBalanceTotals } from '../utils/transformers';

describe('loadTrialBalance is live + correct', () => {
  test('maps the real backend envelope and reports balanced', async () => {
    api.getTrialBalance.mockResolvedValueOnce({
      rows: [
        { ledger: 'Cash-in-Hand', code: 'L1', group: 'Cash-in-Hand', openingDebit: 0, openingCredit: 0, debit: 1000, credit: 500, closingDebit: 500, closingCredit: 0 },
        { ledger: 'Sales A/c',    code: 'L2', group: 'Sales Accounts', openingDebit: 0, openingCredit: 0, debit: 0, credit: 500, closingDebit: 0, closingCredit: 500 },
      ],
      totalClosingDebit: 500, totalClosingCredit: 500, balanced: true,
    });

    const out = await loadTrialBalance({ branch: 'BOM', from: '2026-04-01', to: '2026-06-25' });

    expect(api.getTrialBalance).toHaveBeenCalledWith({ branch: 'BOM', from: '2026-04-01', to: '2026-06-25' });
    expect(out.rows).toHaveLength(2);
    expect(out.grandClosingDebit).toBe(500);   // totalClosingDebit → grandClosingDebit
    expect(out.grandClosingCredit).toBe(500);
    expect(out.balanced).toBe(true);
  });

  test('flags out-of-balance when the server says so', async () => {
    api.getTrialBalance.mockResolvedValueOnce({
      rows: [{ ledger: 'X', code: '', group: 'G', closingDebit: 100, closingCredit: 0 }],
      totalClosingDebit: 100, totalClosingCredit: 0, balanced: false,
    });
    const out = await loadTrialBalance({ branch: 'AMD' });
    expect(out.balanced).toBe(false);
    expect(out.grandClosingDebit).toBe(100);
    expect(out.grandClosingCredit).toBe(0);
  });

  test('falls back gracefully for a pre-migration backend (only debit/credit)', async () => {
    api.getTrialBalance.mockResolvedValueOnce({
      rows: [{ ledger: 'Y', code: '', group: 'G', debit: 250, credit: 0 }],
      totalDebit: 250, totalCredit: 250,   // legacy field names
    });
    const out = await loadTrialBalance({});
    // row with no closing* → debit/credit become closing columns
    expect(out.rows[0].closingDebit).toBe(250);
    expect(out.grandClosingDebit).toBe(250);
    expect(out.balanced).toBe(true);
  });

  test('empty / nullish response is safe', async () => {
    api.getTrialBalance.mockResolvedValueOnce(null);
    const out = await loadTrialBalance({});
    expect(out.rows).toEqual([]);
    expect(out.balanced).toBe(true);
  });
});

describe('transformers stay numeric-safe', () => {
  test('normalizeTrialBalanceRow coerces junk to 0 and fills the 6 columns', () => {
    const r = normalizeTrialBalanceRow({ group: 'G', ledger: 'L', closingDebit: 'abc', closingCredit: 9 });
    expect(r.closingDebit).toBe(0);   // non-number → 0
    expect(r.closingCredit).toBe(9);
    expect(r.openingDebit).toBe(0);
  });

  test('trialBalanceTotals sums every column', () => {
    const t = trialBalanceTotals([
      { closingDebit: 10, closingCredit: 0, debit: 10, credit: 0, openingDebit: 0, openingCredit: 0 },
      { closingDebit: 0, closingCredit: 10, debit: 0, credit: 10, openingDebit: 0, openingCredit: 0 },
    ]);
    expect(t.closingDebit).toBe(10);
    expect(t.closingCredit).toBe(10);
  });
});
