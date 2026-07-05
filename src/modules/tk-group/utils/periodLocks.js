// ─── TK GROUP · FE · period-lock shaping (pure) ──────────────────────────────

/** A valid accounting period is 'YYYY-MM' with a real month (01–12). */
export function isValidPeriod(p) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(p || ''));
}

/** Human label for a lock status. */
export function statusLabel(status) {
  return ({ open: 'Open', soft: 'Soft (warn)', hard: 'Hard (blocked)' })[status] || status || '';
}

/** Lock state → rows for the table, newest period first then by branch. */
export function lockRows(state) {
  const items = (state && state.items) || [];
  return [...items].sort(
    (a, b) => String(b.period).localeCompare(String(a.period))
      || String(a.branch).localeCompare(String(b.branch)),
  );
}
