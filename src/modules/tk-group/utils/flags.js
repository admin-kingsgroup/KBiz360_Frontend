// ─── TK GROUP · FE · flag shaping (pure) ─────────────────────────────────────

/** Flag state → sorted rows for the panel. Foundation flags always read as ON. */
export function flagRows(state) {
  const flags = (state && state.flags) || {};
  return Object.keys(flags).sort().map((key) => {
    const f = flags[key] || {};
    return {
      key,
      enabled: f.foundation === true ? true : f.enabled === true,
      foundation: f.foundation === true,
      scope: f.scope || 'global',
    };
  });
}

/** The next flags map with `key` toggled. Foundation flags are never changed. */
export function withToggled(state, key) {
  const flags = { ...((state && state.flags) || {}) };
  const f = { ...(flags[key] || {}) };
  if (f.foundation === true) return flags;
  f.enabled = !(f.enabled === true);
  flags[key] = f;
  return flags;
}

const isBranchScope = (b) => b && b !== 'default' && b !== 'ALL';

/** Effective state of a flag FOR A BRANCH (branch override → global). Foundation on.
 *  `branch` falsy/'default' → the global value. Mirrors the backend isEnabled. */
export function isFlagOn(state, key, branch) {
  const f = ((state && state.flags) || {})[key] || {};
  if (f.foundation === true) return true;
  if (isBranchScope(branch) && f.branches && Object.prototype.hasOwnProperty.call(f.branches, branch)) {
    return f.branches[branch] === true;
  }
  return f.enabled === true;
}

/** The next flags map with `key` toggled FOR A BRANCH (writes a per-branch override),
 *  or globally when branch is falsy/'default'. Foundation flags are never changed. Used
 *  by the non-owner propose path; the Owner's live path posts { key, enabled, branch }. */
export function withBranchToggled(state, key, branch) {
  const flags = { ...((state && state.flags) || {}) };
  const f = { ...(flags[key] || {}) };
  if (f.foundation === true) return flags;
  if (isBranchScope(branch)) {
    const cur = f.branches && Object.prototype.hasOwnProperty.call(f.branches, branch) ? f.branches[branch] === true : (f.enabled === true);
    f.branches = { ...(f.branches || {}), [branch]: !cur };
  } else {
    f.enabled = !(f.enabled === true);
  }
  flags[key] = f;
  return flags;
}
