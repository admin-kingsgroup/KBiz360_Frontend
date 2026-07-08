import { statusTone, statusLabel, severityTone, readinessKpis, readinessRows, categoryRows } from '../utils/setupReadiness';

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

  test('readinessKpis: pending / error / warn / branches from summary', () => {
    const d = { summary: { modulesPending: 12, error: 5, warn: 4, info: 3, branchesAffected: 6 } };
    const k = readinessKpis(d);
    expect(k[0]).toMatchObject({ key: 'pending', value: '12' });
    expect(k[1]).toMatchObject({ key: 'error', value: '5' });
    expect(k[2]).toMatchObject({ key: 'warn', value: '4' });
    expect(k[3]).toMatchObject({ key: 'branches', value: '6' });
    expect(k).toHaveLength(4);
  });

  test('readinessRows / categoryRows pass through payload arrays', () => {
    const d = { issues: [{ key: 'hr-attendance' }], byCategory: [{ category: 'HR', error: 2 }] };
    expect(readinessRows(d)).toHaveLength(1);
    expect(categoryRows(d)[0].category).toBe('HR');
  });

  test('fail-soft on empty payload', () => {
    expect(readinessKpis({})[0]).toMatchObject({ value: '0' });
    expect(readinessRows(undefined)).toEqual([]);
    expect(categoryRows({})).toEqual([]);
  });
});
