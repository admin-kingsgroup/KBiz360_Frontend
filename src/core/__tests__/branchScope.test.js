/* Locks in the fix for "some pages show failed to fetch until I refresh":
   login and refresh must resolve to a branch the user can actually access, or
   the server-side branch scoping (auth.middleware enforceBranchScope) 403s every
   branch-scoped read. pickBranchForUser is the single picker both paths use. */
import { pickBranchForUser, isFullScope } from '../branchScope';
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
