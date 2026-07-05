// ─── TK GROUP · FE · change-request shaping (pure) ───────────────────────────

/** Roles in the chain that have not yet signed (what the request is waiting on). */
export function waitingRoles(cr) {
  const signed = new Set(((cr && cr.approvals) || []).map((a) => a.role));
  return (((cr && cr.chain) || []).map((l) => l.role)).filter((r) => !signed.has(r));
}

/** Human label for a change-request status. */
export function statusLabel(status) {
  return ({ pending: 'Pending', approved: 'Approved', rejected: 'Rejected', applied: 'Applied' })[status] || status || '';
}
