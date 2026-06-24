/**
 * Director Dashboard branch-scope rule.
 *
 * Regression: the Director Dashboard used to read its own in-page scope dropdown
 * (default 'ALL'), so picking a branch (e.g. AMD) in the top-right shell selector
 * had no effect — it kept showing consolidated (= BOM, the only branch with data).
 * Scope must now come ONLY from the shell `branch` prop.
 */
import { directorScope, branchSpecificScope, scopeBranchArg } from './director-dashboard.scope';

describe('directorScope — scope comes only from the shell branch selector', () => {
  test("consolidated: branch === 'ALL' → scope 'ALL'", () => {
    expect(directorScope('ALL')).toBe('ALL');
  });

  test('a selected branch object → that branch code (AMD scopes to AMD, not ALL)', () => {
    expect(directorScope({ code: 'AMD', city: 'Ahmedabad' })).toBe('AMD');
    expect(directorScope({ code: 'BOM', city: 'Mumbai' })).toBe('BOM');
  });

  test('missing / malformed branch falls back to consolidated', () => {
    expect(directorScope(undefined)).toBe('ALL');
    expect(directorScope(null)).toBe('ALL');
    expect(directorScope({})).toBe('ALL');
  });
});

describe('branchSpecificScope — Director Dashboard never consolidates', () => {
  test('a selected branch → that branch code', () => {
    expect(branchSpecificScope({ code: 'AMD' })).toBe('AMD');
    expect(branchSpecificScope({ code: 'NBO' })).toBe('NBO');
  });

  test("consolidated ('ALL') → null (no single branch; show the pick-a-branch notice)", () => {
    expect(branchSpecificScope('ALL')).toBeNull();
  });

  test('missing / malformed branch → null (not a blended ALL)', () => {
    expect(branchSpecificScope(undefined)).toBeNull();
    expect(branchSpecificScope(null)).toBeNull();
    expect(branchSpecificScope({})).toBeNull();
  });
});

describe('scopeBranchArg — scope code → accounting/booking branch arg', () => {
  test("'ALL' stays the consolidated sentinel", () => {
    expect(scopeBranchArg('ALL')).toBe('ALL');
  });

  test('a branch code becomes { code } so the API sends ?branch=<code>', () => {
    expect(scopeBranchArg('AMD')).toEqual({ code: 'AMD' });
  });

  test('empty scope falls back to consolidated', () => {
    expect(scopeBranchArg('')).toBe('ALL');
    expect(scopeBranchArg(undefined)).toBe('ALL');
  });
});

describe('end-to-end: AMD selection isolates the dashboard to AMD', () => {
  test('AMD branch object resolves to an AMD-scoped API arg (zeros for an empty branch)', () => {
    const arg = scopeBranchArg(directorScope({ code: 'AMD', city: 'Ahmedabad' }));
    expect(arg).toEqual({ code: 'AMD' }); // → /api/accounting/module-pl?branch=AMD → 0s
  });

  test('Consolidated selection stays whole-company', () => {
    expect(scopeBranchArg(directorScope('ALL'))).toBe('ALL');
  });
});
