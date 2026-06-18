// fmtDate must render a stored ISO date by its calendar components, NOT by parsing it
// through new Date('YYYY-MM-DD') (UTC midnight) which shows one day earlier in any
// timezone behind UTC. Force a negative-offset TZ so a regression to the old UTC-parse
// implementation would fail this test (in IST the old code happened to be correct).
process.env.TZ = 'America/New_York';

import { fmtDate } from '../core/dates';

describe('fmtDate — timezone-independent ISO rendering', () => {
  test('financial-year boundary dates render exactly (no off-by-one)', () => {
    expect(fmtDate('2026-04-01')).toBe('01-Apr-2026'); // FY start
    expect(fmtDate('2026-03-31')).toBe('31-Mar-2026'); // FY end
    expect(fmtDate('2026-01-01')).toBe('01-Jan-2026');
    expect(fmtDate('2025-12-31')).toBe('31-Dec-2025');
  });

  test('an ISO datetime is rendered by its date part', () => {
    expect(fmtDate('2026-06-04T23:30:00Z')).toBe('04-Jun-2026');
  });

  test('empty → em dash; unparseable input is passed through unchanged', () => {
    expect(fmtDate('')).toBe('—');
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate('not-a-date')).toBe('not-a-date'); // NaN fallback → String(iso)
  });
});
