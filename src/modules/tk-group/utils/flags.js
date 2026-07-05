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
