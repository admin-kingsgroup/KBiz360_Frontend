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
