// ─── TK GROUP · FE · approval SLA / escalation (pure) ────────────────────────
// How long a pending change-request has waited, against an Owner-set clearance SLA.
// Surfacing ONLY — it never blocks a write; it drives the "stale-approval SLA +
// escalation" watch on the governance queue so an item can't sit unseen. Pure &
// testable; the queue passes its pending items + the configured SLA hours.

export const SLA_DEFAULT_HOURS = 48;   // default clearance SLA when none is configured
export const AT_RISK_FRACTION = 0.75;  // ≥75% of the SLA elapsed → at-risk (nudge the approver)

/** Fractional hours a request has waited since it was raised (createdAt ISO). Never
 *  negative; an unparseable / missing date reads as age 0 (treated as fresh). */
export function ageHours(createdAt, now = Date.now()) {
  const t = createdAt ? Date.parse(createdAt) : NaN;
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (now - t) / 3_600_000);
}

/** SLA state for one pending item: breached (past the SLA) · at-risk (≥75% elapsed) ·
 *  ontime. Returns the whole-hour age and how far past the SLA it has gone. */
export function slaState(item, now = Date.now(), slaHours = SLA_DEFAULT_HOURS) {
  const sla = Number(slaHours) > 0 ? Number(slaHours) : SLA_DEFAULT_HOURS;
  const age = ageHours(item && item.createdAt, now);
  const state = age >= sla ? 'breached' : age >= sla * AT_RISK_FRACTION ? 'at-risk' : 'ontime';
  return { ageHours: Math.round(age), state, overdueByHours: Math.max(0, Math.round(age - sla)) };
}

/** Chip tone for an SLA state. */
export function slaTone(state) {
  return state === 'breached' ? 'danger' : state === 'at-risk' ? 'warning' : 'success';
}

export const SLA_LABEL = { breached: 'SLA breached', 'at-risk': 'At risk', ontime: 'On time' };

/** Classify a queue of pending items → each with its `sla`, a state summary, and the
 *  worst-aged item (the one to escalate first). Pure — the queue renders from this. */
export function classifySla(items = [], now = Date.now(), slaHours = SLA_DEFAULT_HOURS) {
  const rows = (Array.isArray(items) ? items : []).map((it) => ({ ...it, sla: slaState(it, now, slaHours) }));
  const summary = { ontime: 0, 'at-risk': 0, breached: 0, total: rows.length };
  for (const r of rows) summary[r.sla.state] += 1;
  const worst = rows.slice().sort((a, b) => b.sla.ageHours - a.sla.ageHours)[0] || null;
  return { rows, summary, worst };
}
