import { healthTone, severityTone, healthVerdict, healthKpis, branchCards, issueRows, domainRows, focusView } from '../utils/health';

describe('TK group health · FE shaping (pure)', () => {
  test('healthTone bands', () => {
    expect(healthTone(90)).toBe('good');
    expect(healthTone(70)).toBe('warn');
    expect(healthTone(40)).toBe('poor');
    expect(healthTone(0)).toBe('critical');
  });

  test('severityTone maps to Badge tones', () => {
    expect(severityTone('error')).toBe('danger');
    expect(severityTone('warn')).toBe('warning');
    expect(severityTone('info')).toBe('info');
  });

  test('healthVerdict thresholds', () => {
    expect(healthVerdict(90)).toBe('Healthy');
    expect(healthVerdict(70)).toBe('Watch');
    expect(healthVerdict(40)).toBe('At risk');
    expect(healthVerdict(10)).toBe('Critical');
  });

  test('healthKpis: score + error/warn/info from group', () => {
    const d = { group: { score: 50, errors: 4, warn: 20, info: 10, branchesWithErrors: 1 } };
    const k = healthKpis(d);
    expect(k[0]).toMatchObject({ key: 'score', value: '50' });
    expect(k[1]).toMatchObject({ key: 'errors', value: '4', sub: '1 branch(es)' });
    expect(k).toHaveLength(4);
  });

  test('branchCards: tone + lead issue, worst-first order preserved', () => {
    const d = { branches: [
      { branch: 'BOM', score: 0, errors: 4, warn: 14, info: 7, topIssues: [{ title: 'Suspense', severity: 'error' }] },
      { branch: 'AMD', score: 73, errors: 0, warn: 3, info: 2, topIssues: [] },
    ] };
    const c = branchCards(d);
    expect(c[0]).toMatchObject({ branch: 'BOM', tone: 'critical' });
    expect(c[0].lead.title).toBe('Suspense');
    expect(c[1]).toMatchObject({ branch: 'AMD', tone: 'warn', lead: null });
  });

  test('issueRows: flattens across branches, errors first then by amount', () => {
    const d = { branches: [
      { branch: 'BOM', topIssues: [{ severity: 'warn', type: 'gst', title: 'GST', amount: 1000 }, { severity: 'error', type: 'susp', title: 'Suspense', amount: 1100000 }] },
      { branch: 'FBM', topIssues: [{ severity: 'error', type: 'ib', title: 'IB', amount: 2600000 }] },
    ] };
    const rows = issueRows(d);
    expect(rows[0]).toMatchObject({ severity: 'error', branch: 'FBM' }); // biggest error first
    expect(rows[1]).toMatchObject({ severity: 'error', branch: 'BOM' });
    expect(rows[2]).toMatchObject({ severity: 'warn' });
  });

  test('fail-soft on empty payload', () => {
    expect(healthKpis({})[0]).toMatchObject({ value: '100' });
    expect(branchCards({})).toEqual([]);
    expect(issueRows(undefined)).toEqual([]);
    expect(domainRows({})).toEqual([]);
  });

  describe('focusView (cockpit Focus scoping)', () => {
    const d = {
      group: { score: 61, errors: 5, warn: 2, info: 1, branchesWithErrors: 2 },
      branches: [{ branch: 'BOM', score: 21, errors: 4, warn: 1, info: 0, topIssues: [] }, { branch: 'AMD', score: 58, errors: 0, warn: 1, info: 1, topIssues: [] }],
      byDomain: [{ key: 'ar', label: 'AR', error: 3, branches: ['BOM'] }, { key: 'bank', label: 'Bank', error: 2, branches: ['AMD'] }],
    };
    test('ALL passes through unchanged', () => { expect(focusView(d, 'ALL')).toBe(d); });
    test('a branch keeps only it and rebuilds group KPIs from it', () => {
      const v = focusView(d, 'BOM');
      expect(v.branches).toEqual([d.branches[0]]);
      expect(v.group).toEqual({ score: 21, errors: 4, warn: 1, info: 0, branchesWithErrors: 1 });
      expect(v.byDomain).toEqual([{ key: 'ar', label: 'AR', error: 3, branches: ['BOM'] }]); // only BOM's domains
      expect(healthKpis(v)[0]).toMatchObject({ value: '21' }); // KPI now reads the branch's score
    });
    test('a branch with no errors → branchesWithErrors 0', () => {
      expect(focusView(d, 'AMD').group.branchesWithErrors).toBe(0);
    });
    test('unknown branch → empty, healthy group', () => {
      expect(focusView(d, 'ZZZ')).toMatchObject({ branches: [], group: { score: 100, errors: 0 } });
    });
  });
});
