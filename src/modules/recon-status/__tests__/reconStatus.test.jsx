import { defaultPeriod, periodEndDate, statusTone, reconSummary, BRANCHES, ACCOUNT_TYPES } from '../utils';

describe('recon status · FE utils (pure)', () => {
  test('defaultPeriod = previous month, with year rollover', () => {
    expect(defaultPeriod(new Date('2026-07-07T00:00:00Z'))).toBe('2026-06');
    expect(defaultPeriod(new Date('2026-01-10T00:00:00Z'))).toBe('2025-12');
  });

  test('periodEndDate = last day of the period', () => {
    expect(periodEndDate('2026-06')).toBe('2026-06-30');
    expect(periodEndDate('2026-02')).toBe('2026-02-28');
    expect(periodEndDate('bad')).toBe('');
  });

  test('statusTone', () => {
    expect(statusTone('reconciled')).toBe('success');
    expect(statusTone('pending')).toBe('warning');
  });

  test('reconSummary counts reconciled / pending', () => {
    const rows = [{ status: 'reconciled' }, { status: 'pending' }, { status: 'reconciled' }];
    expect(reconSummary(rows)).toEqual({ total: 3, reconciled: 2, pending: 1 });
    expect(reconSummary([])).toEqual({ total: 0, reconciled: 0, pending: 0 });
    expect(reconSummary(undefined)).toEqual({ total: 0, reconciled: 0, pending: 0 });
  });

  test('constants present', () => {
    expect(BRANCHES).toHaveLength(6);
    expect(ACCOUNT_TYPES.map((t) => t.value)).toEqual(['bank', 'client', 'supplier', 'accruals', 'other']);
  });
});
