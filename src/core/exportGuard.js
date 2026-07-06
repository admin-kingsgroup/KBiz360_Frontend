// ─── Report/Export controls — central dormant guard ──────────────────────────
// A single chokepoint the shared export helpers (exportToExcel, exportRptTable)
// consult before producing a file:
//   • restrict               — only permitted roles may export sensitive reports;
//   • blockBranchGroupExport — a branch-scoped user can't export a consolidated
//                              (group / ALL) report;
//   • logAll                 — every export (allowed or blocked) is recorded to the
//                              central export trail (POST /api/export-audit).
// DORMANT by default: with no policy engaged (all flags OFF) canExport always allows
// and nothing is logged, so exports behave EXACTLY as before. The policy is derived
// from the TK Group flags (readExportPolicy) and only bites once the Owner engages it.

export const EXPORT_FLAGS = {
  restrict: 'reports.restrict_export',
  blockBranchGroup: 'reports.block_branch_group_export',
  logAll: 'reports.log_exports',
};

const flagOn = (flags, key) => {
  const f = (flags && flags[key]) || {};
  return f.foundation === true || f.enabled === true;
};

/** Derive the export policy from a flag-state ({ flags: {...} }). All OFF by default. */
export function readExportPolicy(state) {
  const flags = (state && state.flags) || {};
  return {
    restrict: flagOn(flags, EXPORT_FLAGS.restrict),
    blockBranchGroupExport: flagOn(flags, EXPORT_FLAGS.blockBranchGroup),
    logAll: flagOn(flags, EXPORT_FLAGS.logAll),
  };
}

// Roles allowed to export sensitive data when `restrict` is engaged: central roles
// plus the branch managers who legitimately run registers. A view-only user is never
// allowed to export under restrict.
const EXPORT_ROLES = new Set([
  'Super Admin', 'super_admin', 'Director', 'Senior Finance Manager', 'Sr. Accounts Executive',
  'Finance Manager', 'Branch Manager', 'Accounts Executive',
]);
const isCentralUser = (u) => {
  const b = u && u.branches;
  return b === 'ALL' || (Array.isArray(b) && b.includes('ALL'));
};

/** Decide whether this export may proceed. Pure — the guard and tests both use it. */
export function canExport({ user, meta = {}, policy } = {}) {
  const p = policy || {};
  if (p.blockBranchGroupExport && meta.scope === 'group' && !isCentralUser(user)) {
    return { allowed: false, reason: 'a branch user cannot export a consolidated (group) report' };
  }
  if (p.restrict) {
    if (user && user.viewOnly === true) return { allowed: false, reason: 'view-only users cannot export' };
    const role = (user && user.role) || '';
    if (!EXPORT_ROLES.has(role)) return { allowed: false, reason: `role '${role || 'unknown'}' is not permitted to export` };
  }
  return { allowed: true, reason: '' };
}

// ── Live policy snapshot (refreshed from flags at boot; OFF until then → dormant) ──
let _policy = {};
export function setExportPolicy(policy) { _policy = policy || {}; }
export function getExportPolicy() { return _policy; }

// ── Configurable providers (set once by the app; unset = fully dormant) ──────────
let _getUser = () => null;
let _getPolicy = getExportPolicy;
let _log = null;
let _notify = null;

export function configureExportGuard({ getUser, getPolicy, log, notify } = {}) {
  if (getUser) _getUser = getUser;
  if (getPolicy) _getPolicy = getPolicy;
  if (log !== undefined) _log = log;
  if (notify !== undefined) _notify = notify;
}

/** Reset providers + policy (tests). */
export function _resetExportGuard() { _getUser = () => null; _getPolicy = getExportPolicy; _log = null; _notify = null; _policy = {}; }

/** Guard a real export action: check policy, log it when logging is on, then run or
 *  block. DORMANT (no restrictive policy) → runs exactly as before and returns its
 *  result. Blocked → does NOT run; notifies the user (if a notifier is set) and
 *  returns false. `meta`: { report, scope:'branch'|'group', branch, format, rowCount }. */
export function guardExport(meta, run) {
  const m = meta || {};
  const user = (_getUser && _getUser()) || null;
  const policy = (_getPolicy && _getPolicy()) || {};
  const verdict = canExport({ user, meta: m, policy });
  if (policy.logAll && _log) {
    try {
      _log({
        report: m.report, scope: m.scope || 'branch', branch: m.branch, format: m.format, rowCount: m.rowCount,
        allowed: verdict.allowed, reason: verdict.reason,
        userId: user && (user.userId || user.id || user.email), email: user && user.email, role: user && user.role,
      });
    } catch { /* logging is fire-and-forget — never blocks a download */ }
  }
  if (!verdict.allowed) {
    if (_notify) { try { _notify(`Export blocked — ${verdict.reason}.`); } catch { /* ignore */ } }
    return false;
  }
  return run ? run() : true;
}
