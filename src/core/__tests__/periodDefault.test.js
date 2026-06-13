// Regression: the financial statements (P&L / Balance Sheet) defaulted to the
// CURRENT financial year (cfy). On 2026-06-13 the books had postings only up to
// 2026-03-31 (prior FY), so a cfy default rendered an all-zero statement. The fix
// switches those screens' default period preset to "all" (inception → today).
// These tests pin the period MATH the fix relies on, deterministically via `now`.

// period.jsx transitively imports api.js (which uses import.meta.env) and the
// useAccounting hook — neither is needed for the pure periodRange() under test,
// so stub them to keep this a fast, dependency-free unit test.
jest.mock('../api', () => ({ apiGet: jest.fn() }));
jest.mock('../useAccounting', () => ({ branchCode: (b) => (b && (b.code || b)) || '' }));

import { periodRange } from '../period';

const NOW = new Date('2026-06-13T10:00:00');         // matches the reported scenario
const DATA_FROM = '2025-09-01';                       // earliest live posting (inception)
const DATA_TO = '2026-03-31';                         // latest live posting

const within = (d, { from, to }) => d >= from && d <= to;

describe('statement default period preset', () => {
  test('cfy (the OLD default) excludes all existing data on 2026-06-13', () => {
    const r = periodRange('cfy', { branch: 'BOM', inception: DATA_FROM, now: NOW });
    expect(r.from).toBe('2026-04-01');                // new FY start — after every posting
    expect(within(DATA_FROM, r)).toBe(false);
    expect(within(DATA_TO, r)).toBe(false);           // 2026-03-31 falls just before the window
  });

  test('all (the NEW default) spans inception → today and covers the data', () => {
    const r = periodRange('all', { branch: 'BOM', inception: DATA_FROM, now: NOW });
    expect(r.from).toBe(DATA_FROM);
    expect(r.to).toBe('2026-06-13');
    expect(within(DATA_FROM, r)).toBe(true);
    expect(within(DATA_TO, r)).toBe(true);
    expect(r.label).toBe('All');
  });

  test('all falls back to a wide-open from when inception is not yet loaded', () => {
    const r = periodRange('all', { branch: 'BOM', now: NOW });   // inception undefined on first paint
    expect(r.from).toBe('2000-01-01');
    expect(within(DATA_FROM, r)).toBe(true);                      // still covers the data
    expect(within(DATA_TO, r)).toBe(true);
  });

  test('Africa (Jan–Dec FY) branches resolve all the same way', () => {
    const r = periodRange('all', { branch: 'NBO', inception: '2024-02-01', now: NOW });
    expect(r.from).toBe('2024-02-01');
    expect(r.to).toBe('2026-06-13');
  });
});
