import { statusTone, statusLabel, sevTone, subjectLabel, constraintLabel, ruleKpis, toggleTarget, constraintNeeds, SUBJECT_KINDS, CONSTRAINT_KINDS } from '../utils/userRules';

describe('TK user rules manager · FE utils (pure)', () => {
  test('statusTone + statusLabel + sevTone (in step with ERP rules)', () => {
    expect(statusTone('active')).toBe('success');
    expect(statusLabel('draft')).toBe('○ Draft');
    expect(sevTone('error')).toBe('danger');
    expect(sevTone('warn')).toBe('warning');
  });

  test('subjectLabel', () => {
    expect(subjectLabel({ kind: 'user', ref: 'faiz@travkings.com' })).toBe('User · faiz@travkings.com');
    expect(subjectLabel({ kind: 'role', ref: 'Accounts Executive' })).toBe('Role · Accounts Executive');
    expect(subjectLabel({ kind: 'all' })).toBe('Everyone');
  });

  test('constraintLabel across kinds', () => {
    expect(constraintLabel({ kind: 'branch', effect: 'deny', values: ['AMD', 'DAR'] })).toBe('Deny branch access · AMD, DAR');
    expect(constraintLabel({ kind: 'approval-limit', effect: 'limit', limit: 100000 })).toBe('Limit to 100000');
    expect(constraintLabel({ kind: 'view-only', effect: 'deny' })).toBe('View-only (read-only)');
    expect(constraintLabel({ kind: 'time-window', effect: 'allow', from: '09:00', to: '18:00' })).toBe('Login time window 09:00–18:00');
  });

  test('constraintNeeds drives which extra input shows', () => {
    expect(constraintNeeds('branch')).toBe('values');
    expect(constraintNeeds('approval-limit')).toBe('limit');
    expect(constraintNeeds('time-window')).toBe('window');
    expect(constraintNeeds('view-only')).toBe('none');
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
    expect(SUBJECT_KINDS.map((s) => s.value)).toEqual(['user', 'role', 'all']);
    expect(CONSTRAINT_KINDS.some((c) => c.value === 'approval-limit')).toBe(true);
  });
});
