// Branch selection scoped to the logged-in user. Shared by App's refresh-time
// branch initializer AND the login handler so both paths resolve to the SAME
// branch — see pickBranchForUser for why that matters.

import { BRANCHES } from './data';

// Full-scope roles see every branch (and the consolidated "ALL" view); everyone
// else is confined to their assigned branches — matching the server-side branch
// scoping (auth.middleware enforceBranchScope) and the BranchSwitcher.
export const FULL_SCOPE_ROLES = ['Super Admin', 'Director', 'Senior Finance Manager', 'Sr. Accounts Executive'];

export function isFullScope(user) {
  return !user || FULL_SCOPE_ROLES.includes(user?.role);
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
      if (b && (full || !Array.isArray(codes) || codes.includes(b.code))) return b;
    }
  } catch { /* ignore */ }
  if (Array.isArray(codes) && codes.length) {
    const b = BRANCHES.find((x) => codes.includes(x.code));
    if (b) return b;
  }
  return BRANCHES[0];
}
