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

/** Map a responsible team to a Badge tone, so the Owner column reads at a glance. */
export function ownerTone(owner) {
  return { Accounts: 'info', Operations: 'warning' }[owner] || 'neutral';
}

/** The per-branch rollup rows (pending + live/total), already ordered by the API. */
export function branchRows(d) {
  return (d && d.byBranch) || [];
}

/** Header KPI tiles: modules pending + severity split + branch fan-out. When a branch
 *  is selected (the in-tab bar, which follows the cockpit Focus) the tiles read THAT
 *  branch's byBranch slice, so they match the filtered table below and the Overview card
 *  — never the group total under a branch-filtered list. 'ALL' (or unset) → group summary. */
export function readinessKpis(d, branch) {
  const s = (d && d.summary) || {};
  const b = branch && branch !== 'ALL' ? ((d && d.byBranch) || []).find((x) => x.branch === branch) : null;
  const src = b || s;
  return [
    { key: 'pending', label: 'Modules pending', value: `${b ? (b.pending || 0) : (s.modulesPending || 0)}`, sub: 'need setup' },
    { key: 'error', label: 'Not started', value: `${src.error || 0}`, sub: 'no data entered' },
    { key: 'warn', label: 'Partly set up', value: `${src.warn || 0}`, sub: 'finish configuring' },
    b
      ? { key: 'branches', label: 'Modules live', value: `${b.live || 0}/${b.total || 0}`, sub: `${branch} in focus` }
      : { key: 'branches', label: 'Branches affected', value: `${s.branchesAffected || 0}`, sub: 'across group' },
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
