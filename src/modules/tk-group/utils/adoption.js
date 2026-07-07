// ─── TK GROUP · FE · ERP adoption shaping (pure) ─────────────────────────────
// Turns the live /adoption payload into what the matrix renders. Kept pure so the
// banding/labels are unit-tested without a network. Everything tolerates an empty
// payload (fail-soft) so the page never breaks the shell.

/** Band a 0-100 adoption pct into a status tone. null → not-applicable. */
export function adoptionTone(pct) {
  if (pct == null) return 'na';
  if (pct === 0) return 'dormant';
  if (pct >= 80) return 'live';
  return 'partial';
}

/** Map a tone to the shared Badge tone name. */
export function badgeTone(tone) {
  return { live: 'success', partial: 'warning', dormant: 'neutral', na: 'neutral' }[tone] || 'neutral';
}

/** A short verdict for a group/branch adoption score. */
export function adoptionVerdict(pct) {
  if (pct >= 70) return 'Well adopted';
  if (pct >= 40) return 'Partly adopted';
  if (pct >= 15) return 'Early / migrating';
  return 'Barely used';
}

/** The KPI tiles for the header: group + one per branch (branchwise, never blended). */
export function adoptionKpis(d) {
  const branches = (d && d.branches) || [];
  const group = (d && d.group && d.group.adoption) || 0;
  return [
    { key: 'group', label: 'Group adoption', value: `${group}%`, verdict: adoptionVerdict(group) },
    ...branches.map((b) => ({ key: b.branch, label: b.branch, value: `${b.adoption}%`, verdict: adoptionVerdict(b.adoption) })),
  ];
}

/** Ordered branch keys present in the payload (drives matrix columns). */
export function branchKeys(d) {
  return ((d && d.branches) || []).map((b) => b.branch);
}

/** Matrix rows straight from the payload (already one row per registry module). */
export function matrixRows(d) {
  return (d && d.matrix) || [];
}

/** Cell display for a module row under one branch column. */
export function cellFor(row, branch) {
  const pct = row && row.byBranch ? row.byBranch[branch] : null;
  return { pct: pct == null ? null : pct, tone: adoptionTone(pct == null ? null : pct) };
}

/** Cell display for the Central column (branch-scope modules show '—'). */
export function centralCell(row) {
  const pct = row ? row.central : null;
  return { pct: pct == null ? null : pct, tone: adoptionTone(pct == null ? null : pct) };
}
