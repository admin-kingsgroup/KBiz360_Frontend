import { statusTone, statusLabel, severityTone, ownerTone, readinessKpis, readinessRows, categoryRows, branchRows } from '../utils/setupReadiness';

describe('TK setup readiness · FE shaping (pure)', () => {
  test('statusTone maps to Badge tones', () => {
    expect(statusTone('dormant')).toBe('danger');
    expect(statusTone('partial')).toBe('warning');
    expect(statusTone('other')).toBe('info');
  });

  test('statusLabel is human-readable', () => {
    expect(statusLabel('dormant')).toBe('Not started');
    expect(statusLabel('partial')).toBe('In progress');
    expect(statusLabel('awaiting')).toBe('Awaiting setup');
  });

  test('severityTone maps to Badge tones', () => {
    expect(severityTone('error')).toBe('danger');
    expect(severityTone('warn')).toBe('warning');
    expect(severityTone('info')).toBe('info');
  });

  test('readinessKpis: pending / error / warn / branches from summary (ALL)', () => {
    const d = { summary: { modulesPending: 12, error: 5, warn: 4, info: 3, branchesAffected: 6 } };
    const k = readinessKpis(d);
    expect(k[0]).toMatchObject({ key: 'pending', value: '12' });
    expect(k[1]).toMatchObject({ key: 'error', value: '5' });
    expect(k[2]).toMatchObject({ key: 'warn', value: '4' });
    expect(k[3]).toMatchObject({ key: 'branches', value: '6' });
    expect(k).toHaveLength(4);
  });

  test('readinessKpis(d, branch): tiles read the branch slice, not the group total', () => {
    // The bug this guards: a branch-filtered table under group KPIs. Focus BOM → tiles = BOM.
    const d = {
      summary: { modulesPending: 182, error: 164, warn: 13, branchesAffected: 6 },
      byBranch: [{ branch: 'BOM', pending: 26, error: 23, warn: 3, info: 0, live: 5, total: 31 }],
    };
    const k = readinessKpis(d, 'BOM');
    expect(k[0]).toMatchObject({ key: 'pending', value: '26' }); // NOT 182
    expect(k[1]).toMatchObject({ key: 'error', value: '23' });   // NOT 164
    expect(k[2]).toMatchObject({ key: 'warn', value: '3' });
    expect(k[3]).toMatchObject({ key: 'branches', value: '5/31' }); // modules live for BOM
    expect(readinessKpis(d, 'ALL')[0]).toMatchObject({ value: '182' }); // ALL still group
  });

  test('ownerTone maps teams to Badge tones', () => {
    expect(ownerTone('Accounts')).toBe('info');
    expect(ownerTone('Operations')).toBe('warning');
    expect(ownerTone('IT & Admin')).toBe('neutral');
    expect(ownerTone('HR')).toBe('neutral');
    expect(ownerTone(undefined)).toBe('neutral');
  });

  test('readinessRows / categoryRows / branchRows pass through payload arrays', () => {
    const d = {
      issues: [{ key: 'hr-attendance' }],
      byCategory: [{ category: 'HR', error: 2 }],
      byBranch: [{ branch: 'BOM', pending: 3, live: 5, total: 31 }],
    };
    expect(readinessRows(d)).toHaveLength(1);
    expect(categoryRows(d)[0].category).toBe('HR');
    expect(branchRows(d)[0]).toMatchObject({ branch: 'BOM', pending: 3, live: 5, total: 31 });
  });

  test('fail-soft on empty payload', () => {
    expect(readinessKpis({})[0]).toMatchObject({ value: '0' });
    expect(readinessRows(undefined)).toEqual([]);
    expect(categoryRows({})).toEqual([]);
    expect(branchRows(undefined)).toEqual([]);
  });
});
