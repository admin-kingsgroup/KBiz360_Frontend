// ─── TK GROUP · FE · Setup / Configuration Readiness shaping (pure) ──────────
// Turns the live /readiness payload into what the Control Tower's setup band renders.
// Kept pure so labels/banding are unit-tested without a network, and tolerant of an
// empty payload so the page never breaks the shell.

/** Map a readiness status to the shared Badge tone. */
export function statusTone(status) {
  return { dormant: 'danger', partial: 'warning' }[status] || 'info';
}

/** A short label for a readiness status. */
export function statusLabel(status) {
  if (status === 'dormant') return 'Not started';
  if (status === 'partial') return 'In progress';
  return 'Awaiting setup';
}

/** Map an issue severity to the shared Badge tone. */
export function severityTone(sev) {
  return { error: 'danger', warn: 'warning', info: 'info' }[sev] || 'neutral';
}

/** Header KPI tiles: modules pending + severity split + branch fan-out. */
export function readinessKpis(d) {
  const s = (d && d.summary) || {};
  return [
    { key: 'pending', label: 'Modules pending', value: `${s.modulesPending || 0}`, sub: 'need setup' },
    { key: 'error', label: 'Not started', value: `${s.error || 0}`, sub: 'no data entered' },
    { key: 'warn', label: 'Partly set up', value: `${s.warn || 0}`, sub: 'finish configuring' },
    { key: 'branches', label: 'Branches affected', value: `${s.branchesAffected || 0}`, sub: 'across group' },
  ];
}

/** The pending punch-list rows (already ranked error→warn→info by the API). */
export function readinessRows(d) {
  return (d && d.issues) || [];
}

/** By-category rollup rows (already worst-first from the API). */
export function categoryRows(d) {
  return (d && d.byCategory) || [];
}
