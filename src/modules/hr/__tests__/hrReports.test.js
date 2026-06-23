import { buildLeaveUtilization, buildAttrition, lastMonths, buildRevisionDue } from '../hrReports';

describe('buildRevisionDue', () => {
  const emps = [
    { id: 'E1', name: 'Aa', branch: 'BOM', joined: '2024-01-10', basic: 40000 },
    { id: 'E2', name: 'Bb', branch: 'BOM', joined: '2025-09-01', basic: 30000 },  // never revised, joined recently
  ];
  const revs = [
    { empId: 'E1', date: '2024-01-10', basic: 36000 },
    { empId: 'E1', date: '2025-06-01', basic: 40000 },  // latest
  ];

  test('uses the latest revision for current basic + last-revised date', () => {
    const row = buildRevisionDue(emps, revs, '2026-06-22').find((r) => r.empId === 'E1');
    expect(row.currentBasic).toBe(40000);
    expect(row.lastRevision).toBe('2025-06-01');
    expect(row.nextDue).toBe('2026-06-01');     // +12 months
    expect(row.status).toBe('OVERDUE');         // 2026-06-01 < 2026-06-22
    expect(row.daysPast).toBe(21);
  });

  test('an employee never revised falls back to join date + master basic', () => {
    const row = buildRevisionDue(emps, revs, '2026-06-22').find((r) => r.empId === 'E2');
    expect(row.currentBasic).toBe(30000);
    expect(row.lastRevision).toBe('2025-09-01');
    expect(row.nextDue).toBe('2026-09-01');     // not yet due
    expect(row.status).toBe('OK');
    expect(row.daysPast).toBeLessThan(0);
  });
});

const EMPS = [
  { id: 'E1', name: 'Aa', branch: 'BOM', joined: '2025-04-01', exit: '' },
  { id: 'E2', name: 'Bb', branch: 'BOM', joined: '2026-01-15', exit: '2026-05-20' }, // joined then left
  { id: 'E3', name: 'Cc', branch: 'AMD', joined: '2024-06-01', exit: '' },
];

describe('buildLeaveUtilization', () => {
  const LEAVES = [
    { empId: 'E1', type: 'Casual Leave', days: 2, status: 'Approved' },
    { empId: 'E1', type: 'Sick Leave', days: 3, status: 'Approved' },
    { empId: 'E1', type: 'Annual Leave', days: 5, status: 'Pending' },  // pending → excluded
    { empId: 'E3', type: 'Earned', days: 4, status: 'Approved' },
  ];

  test('counts only approved days, split by type, against entitlement', () => {
    const rows = buildLeaveUtilization(EMPS, LEAVES, 30);
    const e1 = rows.find((r) => r.empId === 'E1');
    expect(e1.casual).toBe(2);
    expect(e1.sick).toBe(3);
    expect(e1.used).toBe(5);                 // pending 5 excluded
    expect(e1.balance).toBe(25);
    expect(Math.round(e1.utilPct)).toBe(17); // 5/30
  });

  test('"Annual" and "Earned" both count as earned leave', () => {
    const e3 = buildLeaveUtilization(EMPS, LEAVES, 30).find((r) => r.empId === 'E3');
    expect(e3.earned).toBe(4);
    expect(e3.used).toBe(4);
  });

  test('an employee with no leave shows zero used / full balance', () => {
    const e = buildLeaveUtilization(EMPS, [], 30).find((r) => r.empId === 'E2');
    expect(e.used).toBe(0);
    expect(e.balance).toBe(30);
    expect(e.utilPct).toBe(0);
  });
});

describe('buildAttrition', () => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];

  test('counts a joiner in the join month and a leaver in the exit month', () => {
    const { rows, ttlJoiners, ttlLeavers } = buildAttrition(EMPS, months);
    expect(rows.find((r) => r.month === '2026-01').joiners).toBe(1); // E2 joined Jan
    expect(rows.find((r) => r.month === '2026-05').leavers).toBe(1); // E2 left May
    expect(ttlJoiners).toBe(1);
    expect(ttlLeavers).toBe(1);
  });

  test('closing headcount reflects who is active at month end', () => {
    const { rows } = buildAttrition(EMPS, months);
    // Apr: E1, E2, E3 all active → 3
    expect(rows.find((r) => r.month === '2026-04').closingHc).toBe(3);
    // May: E2 exited 2026-05-20 (exit > 2026-05-31 is false) → 2
    expect(rows.find((r) => r.month === '2026-05').closingHc).toBe(2);
  });

  test('attrition rate is leavers over opening headcount', () => {
    const may = buildAttrition(EMPS, months).rows.find((r) => r.month === '2026-05');
    expect(may.openingHc).toBe(3);            // closing 2 - joiners 0 + leavers 1
    expect(Math.round(may.attritionRate)).toBe(33); // 1/3
  });
});

describe('lastMonths', () => {
  test('returns N chronological YYYY-MM ending at the given month', () => {
    expect(lastMonths('2026-03', 4)).toEqual(['2025-12', '2026-01', '2026-02', '2026-03']);
  });
});
