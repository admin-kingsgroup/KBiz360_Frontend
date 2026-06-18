// Low-severity fix: vouchersToSheet multi-line meta must aggregate (sum numbers, join
// distinct text) instead of keeping only the first line's value.
// (priorYearRange is covered by a standalone node check — its module pulls in period.jsx
// which uses import.meta and can't load under jest without mocking the whole chain.)
import { vouchersToSheet } from '../core/exportExcel';

describe('vouchersToSheet — multi-line meta aggregation', () => {
  test('numeric meta sums across lines; text meta joins distinct values', () => {
    const v = {
      date: '2026-01-01', vno: 'SF1', lines: [
        { meta: { base_fare: 1000, ticket: 'T1' } },
        { meta: { base_fare: 500, ticket: 'T2' } },
        { meta: { base_fare: 200, ticket: 'T1' } }, // duplicate ticket → not repeated
      ],
    };
    const { rows } = vouchersToSheet([v]);
    expect(rows[0]['meta:base_fare']).toBe(1700); // 1000+500+200 (was 1000 — first only)
    expect(rows[0]['meta:ticket']).toBe('T1, T2'); // distinct join
  });
});
