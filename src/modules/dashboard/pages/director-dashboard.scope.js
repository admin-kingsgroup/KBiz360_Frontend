/**
 * Director Dashboard branch-scope rule (pure, dependency-free so it's unit-testable).
 *
 * Branch scope for the Director Dashboard comes ONLY from the top-right shell
 * selector (branch-isolation rule) — never a per-screen dropdown that can diverge.
 * `branch` is the string 'ALL' (Consolidated / TK HO Group) or a branch object
 * { code, city }.
 */

/** Shell branch → scope CODE ('ALL' for consolidated, otherwise e.g. 'AMD'). */
export const directorScope = (branch) => (branch === 'ALL' ? 'ALL' : (branch?.code || 'ALL'));

/**
 * Branch-SPECIFIC scope for the Director Dashboard — never consolidates.
 * Returns the selected branch code, or `null` when the consolidated/TK HO Group
 * view ('ALL') is active (the Director Dashboard is single-branch only; the
 * whole-company consolidated view lives on the owner-only Owner Dashboard).
 */
export const branchSpecificScope = (branch) =>
  (branch && branch !== 'ALL' && branch.code) ? branch.code : null;

/**
 * Branches to drive the branch-comparison table (Owner Dashboard):
 *  • scope 'ALL'  → every branch (group comparison).
 *  • a branch code → ONLY that branch (selector on a branch ⇒ that branch's data only).
 */
export const branchListForScope = (scope, branches) =>
  (!scope || scope === 'ALL') ? branches : branches.filter((b) => b.code === scope);

/** Scope code → the `branch` arg the accounting/booking accessors expect
 *  ('ALL' for consolidated, otherwise { code } so the API sends ?branch=<code>). */
export const scopeBranchArg = (scope) => (scope && scope !== 'ALL' ? { code: scope } : 'ALL');
