// ─── TK GROUP · FE · Scrutiny Trend shaping (pure) ──────────────────────────
// Turns the live /trend payload (issues opened-vs-fixed per week, per branch) into the
// Control Tower's trend band. Pure so banding is unit-tested; tolerant of empty payload.

/** Tone for a trend direction. improving = good, worsening = bad. */
export function directionTone(direction) {
  return { improving: 'success', worsening: 'danger', flat: 'neutral' }[direction] || 'neutral';
}

/** Arrow glyph for a direction. */
export function directionGlyph(direction) {
  return { improving: '▲', worsening: '▼', flat: '▬' }[direction] || '▬';
}

/** Header KPI tiles: open now, opened & fixed over the window, avg time-to-fix. */
export function trendKpis(d) {
  const g = (d && d.group) || {};
  return [
    { key: 'open', label: 'Open now', value: `${g.openNow || 0}`, sub: 'across group' },
    { key: 'fixed', label: 'Fixed (8 wk)', value: `${g.fixed || 0}`, sub: 'issues cleared' },
    { key: 'opened', label: 'Opened (8 wk)', value: `${g.opened || 0}`, sub: 'issues raised' },
    { key: 'avgfix', label: 'Avg time-to-fix', value: `${g.avgFixHrs || 0}h`, sub: `${Math.round((g.avgFixHrs || 0) / 24)}d` },
  ];
}

/** Branch rows (as returned — order preserved). */
export function branchRows(d) {
  return (d && d.branches) || [];
}

/** Max weekly value in a branch (opened or fixed) for bar scaling — never below 1. */
export function branchMax(branch) {
  return Math.max(1, ...((branch && branch.weeks) || []).map((w) => Math.max(w.opened || 0, w.fixed || 0)));
}

/** Group net direction verdict. */
export function trendVerdict(d) {
  const g = (d && d.group) || {};
  const dir = g.direction || 'flat';
  if (dir === 'improving') return `Improving — ${g.fixed} fixed vs ${g.opened} opened`;
  if (dir === 'worsening') return `Worsening — ${g.opened} opened vs ${g.fixed} fixed`;
  return 'Flat — opened and fixed in balance';
}

/** Narrow a live payload to the cockpit Focus: keep only the spotlighted branch and take
 *  its own open-now / opened / fixed / direction as the group KPIs. 'ALL' passes through. */
export function focusView(d, focus) {
  if (!d || !focus || focus === 'ALL') return d || {};
  const b = (d.branches || []).find((x) => x.branch === focus);
  if (!b) return { ...d, branches: [], group: { openNow: 0, fixed: 0, opened: 0, avgFixHrs: 0, direction: 'flat' } };
  return {
    ...d,
    branches: [b],
    group: { openNow: b.openNow, fixed: b.fixed, opened: b.opened, avgFixHrs: b.avgFixHrs, direction: b.direction },
  };
}
