// The Reconciliation nav-pill badge must agree with the Queue tile and the bell:
// a 'superseded' weekly cycle (its month is already certified — Covered by Month-End)
// is NOT pending and NOT overdue, exactly like a 'closed' one.
// core/api uses import.meta (unparseable by jest) — stub the api/accounting deps the
// module pulls so we can test the pure navCountFromRows helper.
jest.mock('../api', () => ({ apiGet: jest.fn(), getAuthToken: jest.fn(() => null) }));
jest.mock('../useAccounting', () => ({ branchCode: (b) => b }));
import { navCountFromRows } from '../useReconciliation';

describe('navCountFromRows — supersession-aware nav pill', () => {
  const today = '2026-08-15';
  test('superseded + closed + upcoming excluded; overdue counts only real past weeks', () => {
    const rows = [
      { tier: 'weekly', period: '2026-W29', state: 'superseded', dueOn: '2026-07-17' }, // covered by Month-End
      { tier: 'weekly', period: '2026-W32', state: 'not-started', dueOn: '2026-08-07' }, // genuinely overdue
      { tier: 'weekly', period: '2026-W33', state: 'in-progress', dueOn: '2026-08-14' }, // genuinely overdue
      { tier: 'weekly', period: '2026-W34', state: 'not-started', dueOn: '2026-08-21', upcoming: true }, // upcoming
      { tier: 'month', period: '2026-07', state: 'closed' }, // closed
      { tier: 'month', period: '2026-08', state: 'not-started' }, // pending, not weekly
    ];
    const r = navCountFromRows(rows, today);
    expect(r.pending).toBe(3);  // W32, W33, month-2026-08
    expect(r.overdue).toBe(2);  // W32, W33 (superseded W29 NOT counted)
  });
  test('a certified month covering all its weeks yields 0 overdue / 0 pending', () => {
    const covered = [
      { tier: 'weekly', period: '2026-W29', state: 'superseded', dueOn: '2026-07-17' },
      { tier: 'weekly', period: '2026-W30', state: 'superseded', dueOn: '2026-07-24' },
    ];
    expect(navCountFromRows(covered, today)).toEqual({ pending: 0, overdue: 0 });
  });
});
