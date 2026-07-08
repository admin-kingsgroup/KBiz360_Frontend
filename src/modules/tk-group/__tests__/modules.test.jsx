import { statusTone, countLabel, sevTone, sevLabel, moduleKpis, issuesFor, heads } from '../utils/modules';

const payload = {
  group: { errors: 2, warnings: 3, info: 1 },
  heads: [
    { head: 'Accounting & Ledgers', status: 'error', count: 2, modules: [
      { id: 'accounting', name: 'Core Accounting', status: 'error', count: 1, issues: [{ sev: 'error', title: 'Suspense', detail: '₹11L', br: 'BOM', source: 'integrity', checkId: 'suspense-postings', count: 6 }] },
      { id: 'ledgers', name: 'Ledgers', status: 'error', count: 1, issues: [{ sev: 'error', title: 'Sub-ledger', detail: '22', br: 'BOM', source: 'integrity', checkId: 'subledger-gl', count: 22 }] },
      { id: 'vouchers', name: 'Vouchers', status: 'clean', count: 0, issues: [] },
    ] },
    { head: 'System', status: 'clean', count: 0, modules: [{ id: 'auth', name: 'Auth', status: 'system', count: 0, issues: [{ sev: 'system', title: 'System' }] }] },
  ],
};

describe('TK modules · FE utils (pure)', () => {
  test('statusTone + countLabel', () => {
    expect(statusTone('error')).toBe('c');
    expect(statusTone('dormant')).toBe('d');
    expect(countLabel('system', 0)).toBe('—');
    expect(countLabel('warn', 3)).toBe('3');
    expect(countLabel('clean', 0)).toBe('✓');
  });

  test('sevTone + sevLabel', () => {
    expect(sevTone('error')).toBe('danger');
    expect(sevTone('warn')).toBe('warning');
    expect(sevLabel('error')).toBe('critical');
    expect(sevLabel('system')).toBe('system');
  });

  test('moduleKpis pulls group + counts modules/dormant', () => {
    const k = moduleKpis(payload);
    expect(k).toMatchObject({ errors: 2, warnings: 3, info: 1, modules: 4 });
  });

  test('issuesFor: overview flattens with module label; module view scopes', () => {
    const overview = issuesFor(payload, null);
    expect(overview).toHaveLength(2);      // 2 error issues (system excluded)
    expect(overview[0]).toHaveProperty('mod');
    const acc = payload.heads[0].modules[0];
    const scoped = issuesFor(payload, { head: payload.heads[0], module: acc });
    expect(scoped).toHaveLength(1);
    expect(scoped[0]).toMatchObject({ checkId: 'suspense-postings' });
  });

  test('fail-soft on empty payload', () => {
    expect(heads({})).toEqual([]);
    expect(moduleKpis({})).toMatchObject({ errors: 0, modules: 0 });
    expect(issuesFor({}, null)).toEqual([]);
  });
});
