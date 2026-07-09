import { defaultPeriod, itcOf, statusTone, summarize, BRANCHES } from '../utils';

describe('GSTR-2B · FE utils (pure)', () => {
  test('defaultPeriod = previous month', () => {
    expect(defaultPeriod(new Date('2026-07-07T00:00:00Z'))).toBe('2026-06');
    expect(defaultPeriod(new Date('2026-01-05T00:00:00Z'))).toBe('2025-12');
  });

  test('itcOf sums the four taxes', () => {
    expect(itcOf({ igst: 1800 })).toBe(1800);
    expect(itcOf({ cgst: 90, sgst: 90, cess: 20 })).toBe(200);
    expect(itcOf({})).toBe(0);
  });

  test('statusTone', () => {
    expect(statusTone('matched')).toBe('success');
    expect(statusTone('unmatched')).toBe('warning');
    expect(statusTone('mismatch')).toBe('danger');
  });

  test('summarize: counts + total ITC', () => {
    const rows = [
      { status: 'matched', igst: 1800 },
      { status: 'unmatched', cgst: 90, sgst: 90 },
      { status: 'mismatch', igst: 500 },
    ];
    expect(summarize(rows)).toEqual({ total: 3, matched: 1, unmatched: 1, mismatch: 1, itc: 2480 });
    expect(summarize([])).toMatchObject({ total: 0, itc: 0 });
  });

  test('BRANCHES', () => { expect(BRANCHES).toHaveLength(6); });
});
