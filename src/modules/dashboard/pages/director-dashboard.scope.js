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

/** Scope code → the `branch` arg the accounting/booking accessors expect
 *  ('ALL' for consolidated, otherwise { code } so the API sends ?branch=<code>). */
export const scopeBranchArg = (scope) => (scope && scope !== 'ALL' ? { code: scope } : 'ALL');
