// ─── TK GROUP · FE · Cockpit branch Focus (pure) ─────────────────────────────
// Inside TK Group Central the top selector stays on the consolidated entity (the
// MODE — "who you are"). This adds a second, in-cockpit control: FOCUS — "which
// branch am I scrutinising". It is a spotlight, NOT a mode switch: the central user
// never leaves the cockpit, keeps full authority, and re-aims every oversight panel
// + the approvals queue at one branch — or at all branches, branchwise.
//
// Invariants:
//   • Default is ALL → branchwise (₹ and $ shown side by side, NEVER summed).
//   • A specific focus is a single branch code, in that branch's native currency.
//   • Focus is meaningful ONLY in cockpit/group mode; a real-branch context ignores it.
//   • Persisted + URL-encodable (?focus=BOM) so a finding is shareable and survives
//     navigation across cockpit pages; reset on leaving the cockpit.
//
// Pure & testable — no React, no imports. The shell wires load/save + URL sync and
// the cockpit pages consume effectiveScope(); this module is just the logic. Mirrors
// utils/groupMode.js (logic here, live wiring separate).

export const FOCUS_ALL = 'ALL';
export const COCKPIT_FOCUS_KEY = 'kb360-cockpit-focus';

/** Coerce any input to a valid focus: an allowed branch code (upper-cased) or ALL.
 *  Unknown / empty / not-in-scope → ALL (branchwise), so a stale or hostile value
 *  can never scope the cockpit to a branch the user may not see. */
export function normalizeFocus(code, validCodes = []) {
  if (!code || typeof code !== 'string') return FOCUS_ALL;
  const c = code.trim().toUpperCase();
  if (c === FOCUS_ALL) return FOCUS_ALL;
  const set = validCodes instanceof Set ? validCodes : new Set(validCodes);
  return set.has(c) ? c : FOCUS_ALL;
}

/** Is the cockpit spotlighting a single branch (vs branchwise ALL)? */
export function isFocused(focus) {
  return !!focus && focus !== FOCUS_ALL;
}

/** Human label for the focus chip / breadcrumb. */
export function focusLabel(focus, consolidatedLabel = 'All branches') {
  return isFocused(focus) ? focus : consolidatedLabel;
}

/** The branch a cockpit query should scope to. ALL = branchwise (server fans out);
 *  a code = that single branch. This is the ONE value oversight pages read, so the
 *  same component serves both the branchwise view and the single-branch drill. */
export function effectiveScope(focus, validCodes = []) {
  return normalizeFocus(focus, validCodes);
}

/** The branch subset a cockpit page should fan out over: ALL → every branch
 *  (branchwise), a focus → just that one. Defensive: a focus that isn't in the
 *  supplied list falls back to the full list so an oversight page is never blank.
 *  Keeps each page's Focus wiring a one-liner. */
export function focusedBranches(focus, allBranches = []) {
  const list = Array.isArray(allBranches) ? allBranches : [];
  if (!isFocused(focus)) return list;
  const sub = list.filter((b) => b && b.code === focus);
  return sub.length ? sub : list;
}

/** Parse ?focus=BOM out of a location.search string (with or without leading '?').
 *  Invalid / absent → ALL. Kept dependency-light via a tiny hand parser so it runs
 *  the same in tests and the browser. */
export function parseFocusParam(search, validCodes = []) {
  if (!search || typeof search !== 'string') return FOCUS_ALL;
  const q = search.charAt(0) === '?' ? search.slice(1) : search;
  for (const pair of q.split('&')) {
    const eq = pair.indexOf('=');
    const key = eq === -1 ? pair : pair.slice(0, eq);
    if (key === 'focus') {
      const val = eq === -1 ? '' : decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '));
      return normalizeFocus(val, validCodes);
    }
  }
  return FOCUS_ALL;
}

/** The URL query fragment for a focus. ALL → '' (clean URL, no dangling param);
 *  a code → 'focus=BOM'. */
export function focusToParam(focus) {
  return isFocused(focus) ? `focus=${encodeURIComponent(focus)}` : '';
}

// ── Storage (injectable so tests stay pure; browser uses localStorage) ──────────
function safeStorage(storage) {
  if (storage) return storage;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

/** Restore the last focus, but only if it's still a valid, in-scope branch. */
export function loadFocus(validCodes = [], storage) {
  const s = safeStorage(storage);
  if (!s) return FOCUS_ALL;
  try { return normalizeFocus(s.getItem(COCKPIT_FOCUS_KEY), validCodes); } catch { return FOCUS_ALL; }
}

/** Persist the focus. ALL clears the key (default state leaves no residue). */
export function saveFocus(focus, storage) {
  const s = safeStorage(storage);
  if (!s) return;
  try {
    if (isFocused(focus)) s.setItem(COCKPIT_FOCUS_KEY, focus);
    else s.removeItem(COCKPIT_FOCUS_KEY);
  } catch { /* ignore quota / disabled storage */ }
}
