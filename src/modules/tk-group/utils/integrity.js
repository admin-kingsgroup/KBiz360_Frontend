// ─── TK GROUP · FE · Close-Readiness & Integrity shaping (pure) ──────────────
// Turns the live /integrity payload into the close-checklist matrix + failing-check
// detail. Pure so status banding is unit-tested; tolerant of an empty payload.

/** Shared Badge tone for a check status. */
export function statusTone(status) {
  return { pass: 'success', fail: 'danger', warn: 'warning', na: 'neutral' }[status] || 'neutral';
}

/** Compact glyph for a matrix cell. */
export function statusGlyph(status) {
  return { pass: '✓', fail: '✗', warn: '!', na: '–' }[status] || '–';
}

/** Header KPI tiles: group close score, failing gates, warnings, branches ready. */
export function integrityKpis(d) {
  const g = (d && d.group) || {};
  return [
    { key: 'score', label: 'Close-readiness', value: `${g.score == null ? 100 : g.score}`, sub: 'group avg' },
    { key: 'fails', label: 'Failing gates', value: `${g.fails || 0}`, sub: 'block close' },
    { key: 'warns', label: 'Warnings', value: `${g.warns || 0}`, sub: 'to review' },
    { key: 'ready', label: 'Branches ready', value: `${g.closeReadyBranches || 0}/${g.totalBranches || 0}`, sub: 'no failing gate' },
  ];
}

/** Branch summary cards (already worst-first from the API). */
export function branchCards(d) {
  return ((d && d.branches) || []).map((b) => ({ branch: b.branch, score: b.score, fails: b.fails, warns: b.warns, closeReady: b.closeReady }));
}

/** Matrix rows: one per check, with a status per branch. Columns come from the payload. */
export function matrixRows(d) {
  const catalogue = (d && d.catalogue) || [];
  const branches = (d && d.branches) || [];
  const statusByBranch = (checkId) => {
    const map = {};
    branches.forEach((b) => { const c = (b.checks || []).find((x) => x.id === checkId); map[b.branch] = c ? c.status : 'na'; });
    return map;
  };
  return catalogue.map((c) => ({ id: c.id, label: c.label, category: c.category, byBranch: statusByBranch(c.id) }));
}

/** Ordered branch keys present in the payload. */
export function branchKeys(d) {
  return ((d && d.branches) || []).map((b) => b.branch);
}

/** Flatten failing + warning checks across branches into detail rows (fails first). */
export function findingRows(d) {
  const rows = [];
  ((d && d.branches) || []).forEach((b) => (b.checks || []).forEach((c) => {
    if (c.status === 'fail' || c.status === 'warn') rows.push({ branch: b.branch, status: c.status, label: c.label, category: c.category, detail: c.detail, count: c.count, sample: c.sample || [] });
  }));
  const rank = { fail: 0, warn: 1 };
  return rows.sort((a, b) => (rank[a.status] - rank[b.status]) || (b.count - a.count));
}
