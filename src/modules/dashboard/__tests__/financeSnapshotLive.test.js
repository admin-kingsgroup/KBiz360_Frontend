// Cluster-1 dashboard wiring: getVarianceFlags + getReconStatus now read live
// backends (budget-vs-actual, bank-reconciliation) instead of seed constants.
// These tests lock in the mapping into each widget's expected shape, and the
// empty-fallback-on-error contract so one failed call never blanks the dashboard.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(), getAuthToken: jest.fn(() => 'open') }));

import { apiGet } from '../../../core/api';
import { getVarianceFlags, getReconStatus, getBankAccounts } from '../api/get-finance-snapshot';

afterEach(() => jest.clearAllMocks());

describe('getVarianceFlags — live budget-vs-actual', () => {
  test('keeps only over-budget rows and maps to the panel shape', async () => {
    apiGet.mockResolvedValueOnce({ rows: [
      { name: 'Office Rent', budget: 100000, actual: 130000 }, // +30k over
      { name: 'Travel',      budget: 50000,  actual: 40000 },  // under → dropped
      { name: 'Telephone',   budget: 10000,  actual: 12000 },  // +2k over
    ] });
    const out = await getVarianceFlags('BOM');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ account: 'Office Rent', variance: 30000, pct: 30, branch: 'BOM' });
    expect(out[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out[1]).toMatchObject({ account: 'Telephone', variance: 2000, pct: 20 });
    // sorted by overspend desc
    expect(out[0].variance).toBeGreaterThan(out[1].variance);
  });

  test('returns [] on error (never blanks the dashboard)', async () => {
    apiGet.mockRejectedValueOnce(new Error('boom'));
    expect(await getVarianceFlags()).toEqual([]);
  });
});

describe('getBankAccounts — live Trial Balance', () => {
  test('keeps only bank/OD ledgers and maps closing balance to openingBal', async () => {
    apiGet.mockResolvedValueOnce({ rows: [
      { ledger: 'HDFC Bank', group: 'Bank Account', closingDebit: 900000, closingCredit: 0 },
      { ledger: 'Cash', group: 'Cash-in-Hand', closingDebit: 50000, closingCredit: 0 }, // not a bank → dropped
      { ledger: 'ICICI OD', group: 'Bank OD / Overdraft', closingDebit: 0, closingCredit: 200000 },
    ] });
    const out = await getBankAccounts('BOM');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ bank: 'HDFC Bank', openingBal: 900000, branch: 'BOM' });
    expect(out[1]).toMatchObject({ bank: 'ICICI OD', openingBal: -200000 });
  });

  test('returns [] on error', async () => {
    apiGet.mockRejectedValueOnce(new Error('boom'));
    expect(await getBankAccounts()).toEqual([]);
  });
});

describe('getReconStatus — live bank-reconciliation', () => {
  test('one row per bank ledger with matched/unmatched + colour status', async () => {
    apiGet
      .mockResolvedValueOnce([{ name: 'HDFC Bank' }, { name: 'ICICI Bank' }])                                  // ledgers
      .mockResolvedValueOnce({ counts: { statementReconciled: 8, statementPartial: 1, statementUnreconciled: 2, statementException: 0 } }) // HDFC → behind
      .mockResolvedValueOnce({ counts: { statementReconciled: 5, statementPartial: 0, statementUnreconciled: 0, statementException: 0 } }); // ICICI → clean
    const out = await getReconStatus('BOM');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ bank: 'HDFC Bank', matched: 9, unmatched: 2, status: 'Behind' });
    expect(out[1]).toMatchObject({ bank: 'ICICI Bank', matched: 5, unmatched: 0, status: 'Clean' });
  });

  test('a failed per-ledger summary degrades that row, not the whole panel', async () => {
    apiGet
      .mockResolvedValueOnce([{ name: 'HDFC Bank' }])
      .mockRejectedValueOnce(new Error('summary failed'));
    const out = await getReconStatus('BOM');
    expect(out).toEqual([{ bank: 'HDFC Bank', status: 'Pending', matched: 0, unmatched: 0 }]);
  });

  test('returns [] when the ledger list call fails', async () => {
    apiGet.mockRejectedValueOnce(new Error('no ledgers'));
    expect(await getReconStatus()).toEqual([]);
  });
});
