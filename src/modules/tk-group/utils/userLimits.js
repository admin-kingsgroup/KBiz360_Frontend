// ─── TK GROUP · FE · per-user approval-ceiling helpers (pure) ────────────────
// Client mirror of the backend resolver. Store: { <email>: { default, branches } }.
// Effective ceiling for (user, branch) = branch override → user default → null (none).
const key = (e) => String(e || '').trim().toLowerCase();
const isDefaultBranch = (b) => !b || b === 'default' || b === 'ALL';

export function resolveUserLimit(store, email, branch) {
  const u = (store || {})[key(email)];
  if (!u) return null;
  if (!isDefaultBranch(branch) && u.branches && u.branches[branch] != null && !Number.isNaN(Number(u.branches[branch]))) {
    return Number(u.branches[branch]);
  }
  return u.default != null && !Number.isNaN(Number(u.default)) ? Number(u.default) : null;
}

/** Does the user have an explicit override for this branch (vs the user default)? */
export function hasUserBranchOverride(store, email, branch) {
  if (isDefaultBranch(branch)) return false;
  const u = (store || {})[key(email)];
  return !!(u && u.branches && u.branches[branch] != null);
}

/** The user's default ceiling (for placeholder display when a branch inherits it). */
export function userDefaultLimit(store, email) {
  const u = (store || {})[key(email)];
  return u && u.default != null ? Number(u.default) : null;
}
