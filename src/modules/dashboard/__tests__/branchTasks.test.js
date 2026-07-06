import { branchTaskBoard } from '../utils/branchTasks';

describe('branchTaskBoard', () => {
  test('groups only the non-zero task categories, priority order', () => {
    const b = branchTaskBoard({ rejected: 2, awaitingMyCheck: 5, pendingBookings: 3, criticalAlerts: 0, warnAlerts: 1 });
    expect(b.groups.map((g) => g.key)).toEqual(['rejected', 'awaitingMyCheck', 'pendingBookings', 'warnAlerts']);
    expect(b.openTotal).toBe(2 + 5 + 3 + 1);
  });

  test('urgent = sum of red-tone groups (rejected + critical + overdue ADM)', () => {
    const b = branchTaskBoard({ rejected: 2, overdueAdm: 1, criticalAlerts: 3, awaitingMyCheck: 4 });
    expect(b.urgent).toBe(2 + 1 + 3);        // awaitingMyCheck is amber, excluded
    expect(b.allClear).toBe(false);
  });

  test('all clear when everything is zero', () => {
    const b = branchTaskBoard({});
    expect(b.groups).toEqual([]);
    expect(b.openTotal).toBe(0);
    expect(b.allClear).toBe(true);
    expect(b.urgent).toBe(0);
  });

  test('coerces bad / negative / fractional input safely', () => {
    const b = branchTaskBoard({ rejected: -3, awaitingMyCheck: '2', pendingBookings: 1.9, warnAlerts: null });
    const byKey = Object.fromEntries(b.groups.map((g) => [g.key, g.count]));
    expect(byKey.rejected).toBeUndefined();   // negative → 0 → dropped
    expect(byKey.awaitingMyCheck).toBe(2);    // '2' → 2
    expect(byKey.pendingBookings).toBe(1);    // 1.9 → floor 1
  });

  test('each group carries a drill route', () => {
    const b = branchTaskBoard({ rejected: 1 });
    expect(b.groups[0].route).toBe('/transactions/voucher-approvals');
  });
});
