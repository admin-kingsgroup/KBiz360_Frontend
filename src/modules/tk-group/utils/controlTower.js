// ─── TK GROUP · FE · Control-Tower Overview scoping (pure) ───────────────────
// The Overview tab shows one summary chart per lens, scoped by the cockpit Focus
// (the top TK Group Central branch selector). These pure helpers pick the right
// numbers for the current scope out of each lens's live payload — group-wide when
// Focus = ALL, or the focused branch's slice otherwise. Kept pure + unit-tested;
// they tolerate empty/partial payloads so the Overview never breaks the shell.

const isAll = (focus) => !focus || focus === 'ALL';

/** Group Health → the 0–100 score for the scope (group score, or the branch's). */
export function scopeHealth(d, focus) {
  if (!d) return { score: 0, label: isAll(focus) ? 'Group' : focus, hasData: false };
  if (isAll(focus)) {
    const s = d.group && d.group.score;
    return { score: s == null ? 0 : s, label: 'Group', hasData: !!d.group };
  }
  const b = (d.branches || []).find((x) => x.branch === focus);
  return { score: b ? b.score : 0, label: focus, hasData: !!b };
}

/** Setup Readiness → the not-started / in-progress / awaiting split for the scope. */
export function scopeSetup(d, focus) {
  const src = isAll(focus) ? (d && d.summary) : ((d && d.byBranch) || []).find((x) => x.branch === focus);
  const s = src || {};
  const error = s.error || 0, warn = s.warn || 0, info = s.info || 0;
  return { error, warn, info, total: error + warn + info };
}

/** Close & Integrity → pass/warn/fail/na gate counts for the scope. For a branch,
 *  count that branch's checks; for the group, take each gate's WORST status across
 *  branches (a gate the group fails anywhere is a group fail). */
export function scopeGates(d, focus) {
  const branches = (d && d.branches) || [];
  const rank = { fail: 3, warn: 2, pass: 1, na: 0 };
  let statuses = [];
  if (!isAll(focus)) {
    const b = branches.find((x) => x.branch === focus);
    statuses = ((b && b.checks) || []).map((c) => c.status);
  } else {
    const worst = {};
    branches.forEach((b) => (b.checks || []).forEach((c) => {
      if (worst[c.id] == null || (rank[c.status] || 0) > (rank[worst[c.id]] || 0)) worst[c.id] = c.status;
    }));
    const cat = (d && d.catalogue) || [];
    statuses = cat.length ? cat.map((g) => worst[g.id] || 'na') : Object.values(worst);
  }
  const n = (s) => statuses.filter((x) => x === s).length;
  return { pass: n('pass'), warn: n('warn'), fail: n('fail'), na: n('na'), total: statuses.length };
}

/** Scrutiny Trend → opened & fixed weekly series for the scope (summed across
 *  branches by week for the group; the focused branch's own weeks otherwise). */
export function scopeTrend(d, focus) {
  const branches = (d && d.branches) || [];
  if (!isAll(focus)) {
    const b = branches.find((x) => x.branch === focus);
    const weeks = (b && b.weeks) || [];
    return { opened: weeks.map((w) => w.opened || 0), fixed: weeks.map((w) => w.fixed || 0) };
  }
  const len = branches.reduce((m, b) => Math.max(m, (b.weeks || []).length), 0);
  const opened = Array(len).fill(0), fixed = Array(len).fill(0);
  branches.forEach((b) => (b.weeks || []).forEach((w, i) => { opened[i] += w.opened || 0; fixed[i] += w.fixed || 0; }));
  return { opened, fixed };
}

/** Max of two series (for a shared y-scale); never below 1 to avoid /0. */
export function seriesMax(...series) {
  return Math.max(1, ...series.flat());
}
