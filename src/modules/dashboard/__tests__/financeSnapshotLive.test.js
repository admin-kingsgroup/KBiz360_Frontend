// Cluster-1 dashboard wiring: getVarianceFlags + getReconStatus now read live
// backends (budget-vs-actual, bank-reconciliation) instead of seed constants.
// These tests lock in the mapping into each widget's expected shape, and the
// empty-fallback-on-error contract so one failed call never blanks the dashboard.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(), getAuthToken: jest.fn(() => 'open') }));

import { apiGet } from '../../../core/api';
import { getVarianceFlags, getReconStatus, getBankAccounts, getBranchHeatmap, getCashForecast, getTopVendorsOverdue, getGstrFiling } from '../api/get-finance-snapshot';

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

describe('getBranchHeatmap — live branch × month GP', () => {
  test('passes through the rows payload', async () => {
    const rows = [{ branch: 'BOM', cells: [{ month: 'Apr', rev: 100, gp: 13 }] }];
    apiGet.mockResolvedValueOnce({ fy: '2026-27', rows });
    expect(await getBranchHeatmap('2026-27')).toEqual(rows);
  });
  test('returns [] on error', async () => {
    apiGet.mockRejectedValueOnce(new Error('boom'));
    expect(await getBranchHeatmap()).toEqual([]);
  });
});

describe('getCashForecast — live 13-week projection', () => {
  test('passes through the weekly rows', async () => {
    const rows = [{ week: 'W1', inflow: 5000, outflow: 2000, closing: 103000 }];
    apiGet.mockResolvedValueOnce({ opening: 100000, rows });
    expect(await getCashForecast('BOM')).toEqual(rows);
  });
  test('returns [] on error', async () => {
    apiGet.mockRejectedValueOnce(new Error('boom'));
    expect(await getCashForecast()).toEqual([]);
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

describe('getTopVendorsOverdue — live AP ageing', () => {
  test('keeps only past-30-day vendors, maps overdueDays from the oldest bucket, ranks oldest-then-largest', async () => {
    apiGet.mockResolvedValueOnce({ payables: { rows: [
      { party: 'Airline A', d0: 1000, d30: 0, d60: 0, d90: 0, net: 1000 },     // only current → dropped
      { party: 'Hotel B',   d0: 0, d30: 5000, d60: 0, d90: 0, net: 5000 },     // 30+
      { party: 'TBO',       d0: 0, d30: 0, d60: 0, d90: 90000, net: 90000 },   // 90+ (oldest)
    ] } });
    const out = await getTopVendorsOverdue('BOM');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: 'TBO', overdueDays: 90, overdueAmount: 90000 }); // oldest first
    expect(out[1]).toMatchObject({ name: 'Hotel B', overdueDays: 30, overdueAmount: 5000 });
  });

  test('returns [] on error (never blanks the panel)', async () => {
    apiGet.mockRejectedValueOnce(new Error('boom'));
    expect(await getTopVendorsOverdue()).toEqual([]);
  });
});

describe('getGstrFiling — live GST return liability', () => {
  test('a specific branch yields one row with the net payable from tax-summary (never a fake "Filed")', async () => {
    apiGet.mockResolvedValueOnce({ netPayable: 123456 }); // tax-summary for BOM
    const out = await getGstrFiling('BOM');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ entity: 'BOM', net: 123456, gstr1: 'Pending', gstr3b: 'Pending' });
    expect(out[0].gstr3b).not.toBe('Filed');
    expect(out[0].due).toMatch(/^20 /);
  });

  test('all-branches fans tax-summary over active branches', async () => {
    apiGet
      .mockResolvedValueOnce([{ code: 'BOM', city: 'Mumbai', tax: '27AAA', active: true }, { code: 'AMD', city: 'Ahmedabad', tax: '24BBB' }]) // branches
      .mockResolvedValueOnce({ netPayable: 1000 })  // BOM
      .mockResolvedValueOnce({ netPayable: 2000 }); // AMD
    const out = await getGstrFiling(null);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ entity: 'Mumbai (BOM)', gstin: '27AAA', net: 1000 });
    expect(out[1]).toMatchObject({ entity: 'Ahmedabad (AMD)', gstin: '24BBB', net: 2000 });
  });

  test('returns [] on error', async () => {
    apiGet.mockRejectedValueOnce(new Error('boom'));
    expect(await getGstrFiling(null)).toEqual([]);
  });
});
