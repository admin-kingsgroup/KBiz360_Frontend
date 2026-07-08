import { statusTone, statusLabel, sevTone, scopeLabel, ruleKpis, toggleTarget, SCOPE_LEVELS, OPS } from '../utils/rules';

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

  test('catalogue constants', () => {
    expect(SCOPE_LEVELS.map((s) => s.value)).toEqual(['erp', 'department', 'module', 'voucher', 'branch']);
    expect(OPS.some((o) => o.value === 'set')).toBe(true);
  });
});
