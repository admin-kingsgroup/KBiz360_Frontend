// ─── TK GROUP · FE · monitoring shaping (pure) ───────────────────────────────

/** Display name for a control_event actor. */
export function actorName(a) {
  return (a && (a.name || a.userId)) || '—';
}

/** The Control Tower headline KPIs from the overview payload. */
export function overviewKpis(o) {
  const controls = (o && o.controls) || [];
  return [
    { key: 'pending', label: 'Pending approvals', value: (o && o.pendingTotal) || 0 },
    { key: 'oldest', label: 'Oldest pending (days)', value: (o && o.oldestPendingDays) || 0 },
    { key: 'locked', label: 'Locked periods', value: (o && o.lockedPeriods) || 0 },
    { key: 'controls', label: 'Active controls', value: controls.filter((c) => c.enabled).length },
  ];
}

/** Pending split by governance vs decision stream. */
export function streamRows(o) {
  const sp = (o && o.streamPending) || {};
  return [
    { key: 'governance', label: 'Governance (config / flags / locks)', value: sp.governance || 0 },
    { key: 'decision', label: 'Decisions (credit / funds / onboarding)', value: sp.decision || 0 },
  ];
}

/** A branch cockpit row's total attention count (what needs looking at). */
export function branchAttention(row) {
  return (row.pendingDecisions || 0) + (row.pendingGovernance || 0) + ((row.lockedPeriods || []).length ? 0 : 0);
}
