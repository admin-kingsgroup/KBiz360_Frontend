// ─── TK GROUP · FE · branch-wise Group Health shaping (pure) ─────────────────
// Turns the live /health payload into what the Control Tower's health band renders.
// Kept pure so banding/labels are unit-tested without a network; tolerant of an empty
// payload so the page never breaks the shell.

/** Band a 0-100 branch health score into a tone. */
export function healthTone(score) {
  if (score >= 85) return 'good';
  if (score >= 60) return 'warn';
  if (score >= 30) return 'poor';
  return 'critical';
}

/** Map a severity to the shared Badge tone. */
export function severityTone(sev) {
  return { error: 'danger', warn: 'warning', info: 'info' }[sev] || 'neutral';
}

/** A short verdict for a group/branch health score. */
export function healthVerdict(score) {
  if (score >= 85) return 'Healthy';
  if (score >= 60) return 'Watch';
  if (score >= 30) return 'At risk';
  return 'Critical';
}

/** The header KPI tiles: group score + issue totals + exposure. */
export function healthKpis(d) {
  const g = (d && d.group) || {};
  return [
    { key: 'score', label: 'Group health', value: `${g.score == null ? 100 : g.score}`, sub: healthVerdict(g.score == null ? 100 : g.score) },
    { key: 'errors', label: 'Critical errors', value: `${g.errors || 0}`, sub: `${g.branchesWithErrors || 0} branch(es)` },
    { key: 'warn', label: 'Warnings', value: `${g.warn || 0}`, sub: 'across group' },
    { key: 'info', label: 'Info', value: `${g.info || 0}`, sub: 'to review' },
  ];
}

/** Branch health cards (already worst-first from the API). */
export function branchCards(d) {
  return ((d && d.branches) || []).map((b) => ({
    branch: b.branch, score: b.score, tone: healthTone(b.score),
    errors: b.errors, warn: b.warn, info: b.info,
    lead: (b.topIssues && b.topIssues[0]) || null,
  }));
}

/** Flatten top issues across branches into rows for the issues table (errors first). */
export function issueRows(d) {
  const rows = [];
  ((d && d.branches) || []).forEach((b) => (b.topIssues || []).forEach((i) => rows.push({ ...i, branch: b.branch })));
  const rank = { error: 0, warn: 1, info: 2 };
  return rows.sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3) || (b.amount || 0) - (a.amount || 0));
}

/** Domain heatmap rows (already worst-first from the API). */
export function domainRows(d) {
  return (d && d.byDomain) || [];
}

/** Narrow a live payload to the cockpit Focus: when a single branch is spotlighted,
 *  keep only that branch and rebuild the group KPIs from it (so "Group health" reads as
 *  the branch's own health); 'ALL' (or unset) passes the group payload through unchanged. */
export function focusView(d, focus) {
  if (!d || !focus || focus === 'ALL') return d || {};
  const b = (d.branches || []).find((x) => x.branch === focus);
  if (!b) return { ...d, branches: [], byDomain: [], group: { score: 100, errors: 0, warn: 0, info: 0, branchesWithErrors: 0 } };
  return {
    ...d,
    branches: [b],
    byDomain: (d.byDomain || []).filter((dm) => (dm.branches || []).includes(focus)),
    group: { score: b.score, errors: b.errors, warn: b.warn, info: b.info, branchesWithErrors: b.errors > 0 ? 1 : 0 },
  };
}
