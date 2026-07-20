/* Locks in the fix for "some pages show failed to fetch until I refresh":
   login and refresh must resolve to a branch the user can actually access, or
   the server-side branch scoping (auth.middleware enforceBranchScope) 403s every
   branch-scoped read. pickBranchForUser is the single picker both paths use. */
import { pickBranchForUser, branchForLogin, isFullScope, hasNoAssignedBranch, canonicalRole, withCanonicalRole, applyRenewedAccess } from '../branchScope';
import { BRANCHES } from '../data';

beforeEach(() => { try { localStorage.removeItem('kb360-branch'); } catch { /* ignore */ } });

describe('pickBranchForUser', () => {
  test('scoped user with no saved branch → their first allowed operating branch', () => {
    const b = pickBranchForUser({ role: 'Accounts Executive', branches: ['AMD'] });
    expect(b).toMatchObject({ code: 'AMD' });
  });

  test('scoped user never gets a branch outside their scope, even if one was saved', () => {
    localStorage.setItem('kb360-branch', 'TKHO'); // e.g. left over from a prior admin session
    const b = pickBranchForUser({ role: 'Accounts Executive', branches: ['BOM'] });
    expect(b).toMatchObject({ code: 'BOM' });   // saved TKHO rejected → falls back to BOM
  });

  test('scoped user never gets "ALL" (consolidated) even if saved', () => {
    localStorage.setItem('kb360-branch', 'ALL');
    const b = pickBranchForUser({ role: 'Branch Accountant', branches: ['BOM'] });
    expect(b).toMatchObject({ code: 'BOM' });
  });

  test('scoped user resumes a saved branch that IS in their scope', () => {
    localStorage.setItem('kb360-branch', 'AMD');
    const b = pickBranchForUser({ role: 'Accounts Executive', branches: ['BOM', 'AMD'] });
    expect(b).toMatchObject({ code: 'AMD' });
  });

  test('full-scope user may resume the consolidated "ALL" view', () => {
    localStorage.setItem('kb360-branch', 'ALL');
    expect(pickBranchForUser({ role: 'Super Admin', branches: ['BOM'] })).toBe('ALL');
  });

  test('full-scope user with a saved branch resumes that branch', () => {
    localStorage.setItem('kb360-branch', 'NBO');
    expect(pickBranchForUser({ role: 'Director' })).toMatchObject({ code: 'NBO' });
  });

  test('no user (logged out) → a concrete branch, never undefined', () => {
    const b = pickBranchForUser(null);
    expect(b).toBeTruthy();
    expect(typeof b === 'object' ? b.code : b).toBeTruthy();
  });

  test('NON-full user with NO branch assigned → null (never falls back to all branches)', () => {
    expect(pickBranchForUser({ role: 'Branch Manager' })).toBe(null);
    expect(pickBranchForUser({ role: 'General Manager', branches: [] })).toBe(null);
  });

  test('a leftover saved branch cannot rescue an unassigned non-full user', () => {
    localStorage.setItem('kb360-branch', 'BOM');
    expect(pickBranchForUser({ role: 'Branch Manager' })).toBe(null);
  });
});

describe('branchForLogin (fresh sign-in resets a TK Group Central member to the group view)', () => {
  test('each full-scope role signs in on "ALL" (TK Group Central)', () => {
    ['Super Admin', 'Director', 'Senior Finance Manager', 'Sr. Accounts Executive']
      .forEach((role) => expect(branchForLogin({ role })).toBe('ALL'));
  });

  test('a canonicalised super_admin (Owner) signs in on TK Group Central', () => {
    expect(branchForLogin(withCanonicalRole({ role: 'super_admin' }))).toBe('ALL');
  });

  test('a saved branch does NOT override the group view on login (login resets; refresh restores)', () => {
    localStorage.setItem('kb360-branch', 'NBO');
    expect(branchForLogin({ role: 'Director' })).toBe('ALL');            // login → reset to group
    expect(pickBranchForUser({ role: 'Director' })).toMatchObject({ code: 'NBO' }); // refresh → keep branch
  });

  test('a NON-full user still lands on their assigned branch, never the group view', () => {
    expect(branchForLogin({ role: 'Branch Accountant', branches: ['BOM'] })).toMatchObject({ code: 'BOM' });
  });

  test('a NON-full user with no assigned branch → null (unchanged from pickBranchForUser)', () => {
    expect(branchForLogin({ role: 'Branch Manager' })).toBe(null);
  });

  test('a full-scope ROLE narrowed to a branch subset (allBranches:false) does NOT default to ALL', () => {
    // The Page Visibility admin can restrict an otherwise all-scope role to specific branches;
    // the server then 403s consolidated reads, so login must land on their in-scope branch, not ALL.
    const b = branchForLogin({ role: 'Sr. Accounts Executive', branches: ['AMD'], allBranches: false });
    expect(b).toMatchObject({ code: 'AMD' });
    expect(b).not.toBe('ALL');
  });

  test('a full-scope user with allBranches true/undefined still lands on ALL', () => {
    expect(branchForLogin({ role: 'Super Admin', allBranches: true })).toBe('ALL');
    expect(branchForLogin({ role: 'Director' })).toBe('ALL'); // undefined → treated as full
  });
});

describe('hasNoAssignedBranch (no assignment = no access)', () => {
  test('true only for a NON-full user with no assigned branch', () => {
    expect(hasNoAssignedBranch({ role: 'General Manager' })).toBe(true);
    expect(hasNoAssignedBranch({ role: 'Branch Manager', branches: [] })).toBe(true);
    expect(hasNoAssignedBranch({ role: 'Branch Accountant', branches: ['BOM'] })).toBe(false);
    expect(hasNoAssignedBranch({ role: 'Super Admin' })).toBe(false); // full-scope
  });
});

describe('six equal peers — no Head Office (isHO removed)', () => {
  test('no branch in the reference set carries an isHO flag', () => {
    BRANCHES.forEach((b) => expect(b).not.toHaveProperty('isHO'));
  });

  // With no Head-Office branch to skip, a full-scope user with nothing saved simply
  // defaults to the first branch — proving default selection no longer keys off isHO.
  test('full-scope user with no saved branch defaults to the first branch', () => {
    expect(pickBranchForUser(null)).toMatchObject({ code: BRANCHES[0].code });
  });
});

describe('isFullScope', () => {
  test('the four full-scope roles are full scope', () => {
    ['Super Admin', 'Director', 'Senior Finance Manager', 'Sr. Accounts Executive']
      .forEach((role) => expect(isFullScope({ role })).toBe(true));
  });
  test('a branch accountant / accounts executive is NOT full scope', () => {
    expect(isFullScope({ role: 'Branch Accountant' })).toBe(false);
    expect(isFullScope({ role: 'Accounts Executive' })).toBe(false);
  });
});

describe('role canonicalisation (super_admin ⇒ Super Admin at ingest)', () => {
  test('canonicalRole folds only the lowercase Owner alias', () => {
    expect(canonicalRole('super_admin')).toBe('Super Admin');
    expect(canonicalRole('Super Admin')).toBe('Super Admin');
    expect(canonicalRole('Director')).toBe('Director'); // untouched
    expect(canonicalRole(undefined)).toBe(undefined);
  });

  test('withCanonicalRole rewrites the role (new object) but preserves the rest', () => {
    const raw = { role: 'super_admin', email: 'x@y.com', branches: ['BOM'] };
    const out = withCanonicalRole(raw);
    expect(out).not.toBe(raw); // new object, no mutation
    expect(out).toEqual({ role: 'Super Admin', email: 'x@y.com', branches: ['BOM'] });
    expect(raw.role).toBe('super_admin'); // original untouched
  });

  test('withCanonicalRole is a pass-through when nothing changes', () => {
    const admin = { role: 'Super Admin' };
    expect(withCanonicalRole(admin)).toBe(admin); // same reference — no needless re-render
    expect(withCanonicalRole(null)).toBe(null);
    expect(withCanonicalRole({ email: 'x' })).toEqual({ email: 'x' }); // no role → unchanged
  });

  test('a canonicalised super_admin is full scope + treated as the four central roles', () => {
    expect(isFullScope(withCanonicalRole({ role: 'super_admin' }))).toBe(true);
  });
});

describe('applyRenewedAccess (silent refresh propagates admin changes without re-login)', () => {
  test('a promoted role is applied (Accounts Executive → Sr. Accounts Executive) → new object, now full scope', () => {
    const prev = { role: 'Accounts Executive', branches: ['BOM'], hidden: [] };
    const out = applyRenewedAccess(prev, { role: 'Sr. Accounts Executive', branches: ['BOM'], hidden: [] });
    expect(out).not.toBe(prev);              // re-render
    expect(out.role).toBe('Sr. Accounts Executive');
    expect(isFullScope(out)).toBe(true);     // → TK Group Central / Tally Reconciliation appear
  });

  test('role is canonicalised on renew (super_admin ⇒ Super Admin)', () => {
    expect(applyRenewedAccess({ role: 'Director' }, { role: 'super_admin' }).role).toBe('Super Admin');
  });

  test('branch scope + view-only propagate', () => {
    const prev = { role: 'Sr. Accounts Executive', branches: ['BOM'], allBranches: false, viewOnly: false, hidden: [] };
    const out = applyRenewedAccess(prev, { role: 'Sr. Accounts Executive', branches: ['ALL'], allBranches: true, viewOnly: true, hidden: [] });
    expect(out).not.toBe(prev);
    expect(out.branches).toEqual(['ALL']);
    expect(out.allBranches).toBe(true);
    expect(out.viewOnly).toBe(true);
  });

  test('page-visibility (hidden) still propagates', () => {
    const out = applyRenewedAccess({ role: 'Director', hidden: [] }, { role: 'Director', hidden: ['/reports/tally-export'] });
    expect(out.hidden).toEqual(['/reports/tally-export']);
  });

  test('nothing changed → SAME reference (renew loop never re-renders itself)', () => {
    const prev = { role: 'Director', branches: ['ALL'], allBranches: true, viewOnly: false, hidden: ['/x'], granted: [] };
    const out = applyRenewedAccess(prev, { role: 'Director', branches: ['ALL'], allBranches: true, viewOnly: false, hidden: ['/x'], granted: [] });
    expect(out).toBe(prev);
  });

  test('null prev or fresh → returns prev untouched (never crashes the renew loop)', () => {
    expect(applyRenewedAccess(null, { role: 'Director' })).toBe(null);
    const prev = { role: 'Director' };
    expect(applyRenewedAccess(prev, null)).toBe(prev);
  });

  test('preserves identity fields absent from the refresh payload (id / name / email)', () => {
    const prev = { id: 'u1', name: 'Sughra', email: 's@x.com', role: 'Accounts Executive', hidden: [] };
    const out = applyRenewedAccess(prev, { role: 'Sr. Accounts Executive', hidden: [] });
    expect(out).toMatchObject({ id: 'u1', name: 'Sughra', email: 's@x.com', role: 'Sr. Accounts Executive' });
  });
});
