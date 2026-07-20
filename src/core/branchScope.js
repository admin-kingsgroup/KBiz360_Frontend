// Branch selection scoped to the logged-in user. Shared by App's refresh-time
// branch initializer AND the login handler so both paths resolve to the SAME
// branch — see pickBranchForUser for why that matters.

import { BRANCHES } from './data';

// Full-scope roles see every branch (and the consolidated "ALL" view); everyone
// else is confined to their assigned branches — matching the server-side branch
// scoping (auth.middleware enforceBranchScope) and the BranchSwitcher.
export const FULL_SCOPE_ROLES = ['Super Admin', 'Director', 'Senior Finance Manager', 'Sr. Accounts Executive'];

// The backend treats 'super_admin' and 'Super Admin' as the SAME Owner identity (its
// role CANON map). The frontend, however, keys every owner gate on the title-case form
// ('Super Admin') — FULL_SCOPE_ROLES here, plus the central-cockpit, dashboards,
// page-access and data-migration checks. So we canonicalise the role ONCE, at user
// ingest (see App.jsx: restore/switch/set), and every downstream check just works —
// rather than sprinkling a dual-alias in a dozen places and risking one being missed.
export function canonicalRole(role) {
  return role === 'super_admin' ? 'Super Admin' : role;
}
export function withCanonicalRole(user) {
  if (!user || !user.role) return user;
  const role = canonicalRole(user.role);
  return role === user.role ? user : { ...user, role };
}

export function isFullScope(user) {
  return !user || FULL_SCOPE_ROLES.includes(user?.role);
}

// Merge the server's RE-READ access (returned by /auth/refresh) into the cached user so an
// admin's change in Settings → Users & Roles (role / branch scope / view-only / page-
// visibility) takes effect within the renew cycle WITHOUT a full re-login. Returns the SAME
// reference when nothing the UI depends on changed (so the renew loop never re-renders
// itself), else a new object. Role is canonicalised (super_admin ⇒ Super Admin) like login.
// Only `hidden` used to be applied, so a promoted role (e.g. AE → Sr. Accounts Executive)
// kept the old menu — no TK Group Central / Tally Reconciliation — until the user re-logged.
export function applyRenewedAccess(prev, fresh) {
  if (!prev || !fresh) return prev;
  const u = withCanonicalRole(fresh);
  const arrEq = (a, b) => { const x = Array.isArray(a) ? a : []; const y = Array.isArray(b) ? b : []; return x.length === y.length && x.every((k) => y.includes(k)); };
  const merged = {
    ...prev,
    role: u.role || prev.role,
    branches: u.branches !== undefined ? u.branches : prev.branches,
    allBranches: u.allBranches !== undefined ? u.allBranches : prev.allBranches,
    viewOnly: u.viewOnly !== undefined ? u.viewOnly : prev.viewOnly,
    hidden: Array.isArray(u.hidden) ? u.hidden : (prev.hidden || []),
    granted: Array.isArray(u.granted) ? u.granted : (prev.granted || []),
  };
  const same = merged.role === prev.role
    && merged.allBranches === prev.allBranches
    && merged.viewOnly === prev.viewOnly
    && arrEq(merged.branches, prev.branches)
    && arrEq(merged.hidden, prev.hidden)
    && arrEq(merged.granted, prev.granted);
  return same ? prev : merged;
}

// A NON-full-scope user (GM / BM / Branch Accountant) with NO branch assigned has no
// access to anything — they must NOT fall back to seeing all branches. An admin has to
// assign them a branch first.
export function hasNoAssignedBranch(user) {
  return !isFullScope(user) && !(Array.isArray(user?.branches) && user.branches.length > 0);
}

// Pick a branch the given user may actually use. Honour the last-saved branch
// ('kb360-branch') when it's still in scope (full-scope users may use any branch,
// incl. "ALL"), else fall back to the user's first allowed branch. All six
// branches are equal peers, so the first allowed one is a fine default.
//
// Why this is shared between login and refresh: a fresh login used to keep
// whatever branch happened to be in memory — often "ALL" or a previous user's
// branch — so every branch-scoped API call 403'd (server-side branch scoping) and
// pages showed "failed to fetch" until a manual refresh re-derived the right
// branch from the stored user. Both paths now run THIS function → same branch.
export function pickBranchForUser(user) {
  const codes = user?.branches;
  const full = isFullScope(user);
  try {
    const saved = localStorage.getItem('kb360-branch');
    if (saved === 'ALL') {
      if (full) return 'ALL';
    } else if (saved) {
      const b = BRANCHES.find((x) => x.code === saved);
      // Non-full users may only restore a saved branch that is actually assigned to them.
      if (b && (full || (Array.isArray(codes) && codes.includes(b.code)))) return b;
    }
  } catch { /* ignore */ }
  if (Array.isArray(codes) && codes.length) {
    const b = BRANCHES.find((x) => codes.includes(x.code));
    if (b) return b;
  }
  // Full-scope → first branch is a fine default. A NON-full user with no assigned branch
  // gets NULL — no all-branch fallback, so they can't see anything until assigned.
  return full ? BRANCHES[0] : null;
}

// Branch to select on a FRESH LOGIN (not a refresh). A TK Group Central member — any
// full-scope user (Owner / Director / Finance Manager / Sr. Accounts Executive) — always
// starts on the group view: Selector A = 'ALL' = "TK Group Central". They operate at the
// group level first, then drill into a branch via the top-right selector as needed. This
// deliberately IGNORES any branch left in localStorage, so every sign-in resets to the
// group view (the switch back to a branch still persists within the session and across
// refreshes — see pickBranchForUser, the refresh-time picker, which restores the saved
// branch so a reload keeps you where you were).
//
// A NON-full user (Branch Accountant / GM / BM) has no group view to land on, so they
// fall through to pickBranchForUser — their assigned branch (or null if unassigned).
//
// GUARD: land on 'ALL' only when the user can ACTUALLY see every branch. A full-scope ROLE
// that the Page Visibility admin has narrowed to a branch subset comes back with
// allBranches===false (auth.service resolveBranches) — the server would then 403 the
// consolidated reads. So a narrowed user falls through to pickBranchForUser (their first
// in-scope branch) instead of 'ALL'. allBranches undefined (older cached session) is
// treated as full — the real TK Group Central members are all-scope, so this is safe.
export function branchForLogin(user) {
  return (isFullScope(user) && user?.allBranches !== false) ? 'ALL' : pickBranchForUser(user);
}
