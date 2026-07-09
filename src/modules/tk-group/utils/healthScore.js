// ─── TK GROUP · FE · consolidated ERP Health Scorecard shaping (pure) ────────

/** Colour for a 0-100 score. */
export function scoreColor(s) {
  if (s >= 85) return '#1a7a4c';
  if (s >= 70) return '#2c9366';
  if (s >= 55) return '#a86a10';
  if (s >= 40) return '#b4531a';
  return '#b23b3b';
}

/** Shared Badge tone for a letter grade. */
export function gradeTone(grade) {
  return { A: 'success', B: 'success', C: 'warning', D: 'warning', F: 'danger' }[grade] || 'neutral';
}

export function verdict(score) {
  if (score >= 85) return 'Healthy';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 40) return 'At risk';
  return 'Critical';
}

/** The three sub-score tiles for the group header. */
export function subScores(d) {
  const g = (d && d.group) || {};
  return [
    { key: 'health', label: 'Health', value: g.health || 0, weight: '50%', hint: 'how clean', suffix: '' },
    { key: 'close', label: 'Close-readiness', value: g.close || 0, weight: '30%', hint: 'can it close', suffix: '' },
    { key: 'adoption', label: 'Adoption', value: g.adoption || 0, weight: '20%', hint: 'how much used', suffix: '%' },
  ];
}

export function branchRows(d) { return (d && d.branches) || []; }
export function groupScore(d) { return (d && d.group) || { composite: 0, grade: 'F', health: 0, close: 0, adoption: 0 }; }
