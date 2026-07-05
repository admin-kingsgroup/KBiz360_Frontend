// ─── TK GROUP CENTRAL · exceptions & risk (pure) ─────────────────────────────
// Governance red-flags derived from a branch's own figures — branchwise, never a
// consolidated total. Each branch is assessed on its own currency/scale.

/** Flags for a single branch scorecard row. */
export function branchExceptions(row) {
  const flags = [];
  if ((row.np || 0) < 0) flags.push({ sev: 'high', label: 'Net loss' });
  if ((row.sales || 0) > 0 && (row.gpPct || 0) < 10) flags.push({ sev: 'med', label: `Thin margin (${row.gpPct || 0}%)` });
  if ((row.bookings || 0) === 0) flags.push({ sev: 'med', label: 'No bookings' });
  return flags;
}

/** Rank helper — branches with the most severe issues first. */
export function riskScore(flags) {
  return (flags || []).reduce((s, f) => s + (f.sev === 'high' ? 10 : f.sev === 'med' ? 3 : 1), 0);
}
