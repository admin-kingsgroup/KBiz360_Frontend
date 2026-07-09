import { statusTone, statusLabel, sevTone, scopeLabel, ruleKpis, toggleTarget, isCommonRule, groupRulesByBranch, SCOPE_LEVELS, OPS } from '../utils/rules';

describe('TK rules manager · FE utils (pure)', () => {
  test('statusTone + statusLabel', () => {
    expect(statusTone('active')).toBe('success');
    expect(statusTone('draft')).toBe('neutral');
    expect(statusLabel('active')).toBe('● Active');
    expect(statusLabel('draft')).toBe('○ Draft');
  });

  test('sevTone', () => {
    expect(sevTone('error')).toBe('danger');
    expect(sevTone('warn')).toBe('warning');
    expect(sevTone('info')).toBe('info');
  });

  test('scopeLabel', () => {
    expect(scopeLabel({ level: 'module', ref: 'customers' })).toBe('Module · customers');
    expect(scopeLabel({ level: 'erp', ref: '' })).toBe('Whole ERP');
    expect(scopeLabel({ level: 'voucher', ref: 'all' })).toBe('Voucher type');
  });

  test('ruleKpis counts', () => {
    const rows = [
      { status: 'active', system: true }, { status: 'active', system: false },
      { status: 'draft', system: false }, { status: 'inactive', system: false },
    ];
    expect(ruleKpis(rows)).toEqual({ total: 4, active: 2, draft: 2, system: 1 });
    expect(ruleKpis([])).toMatchObject({ total: 0 });
  });

  test('toggleTarget flips active↔inactive', () => {
    expect(toggleTarget('active')).toBe('inactive');
    expect(toggleTarget('draft')).toBe('active');
  });

  test('isCommonRule — ALL / empty / missing branches are common', () => {
    expect(isCommonRule({ scope: { branches: ['ALL'] } })).toBe(true);
    expect(isCommonRule({ scope: { branches: [] } })).toBe(true);
    expect(isCommonRule({ scope: {} })).toBe(true);
    expect(isCommonRule({})).toBe(true);
    expect(isCommonRule({ scope: { branches: ['BOM'] } })).toBe(false);
  });

  test('groupRulesByBranch — common first, branch sections in given order, multi-branch rules repeat', () => {
    const rows = [
      { ruleId: 'A', scope: { branches: ['ALL'] } },
      { ruleId: 'B', scope: { branches: ['NBO'] } },
      { ruleId: 'C', scope: { branches: ['BOM', 'NBO'] } },
      { ruleId: 'D', scope: {} },
    ];
    const g = groupRulesByBranch(rows, ['BOM', 'NBO']);
    expect(g.common.map((r) => r.ruleId)).toEqual(['A', 'D']);
    expect(g.branches.map((b) => b.branch)).toEqual(['BOM', 'NBO']);
    expect(g.branches[0].rules.map((r) => r.ruleId)).toEqual(['C']);
    expect(g.branches[1].rules.map((r) => r.ruleId)).toEqual(['B', 'C']);
    expect(groupRulesByBranch([])).toEqual({ common: [], branches: [] });
  });

  test('catalogue constants', () => {
    expect(SCOPE_LEVELS.map((s) => s.value)).toEqual(['erp', 'department', 'module', 'voucher', 'branch']);
    expect(OPS.some((o) => o.value === 'set')).toBe(true);
  });
});
