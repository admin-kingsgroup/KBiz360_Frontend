// ─── TK GROUP · FE · Modules tree shaping (pure) ─────────────────────────────
// Helpers for the "Control Tower by module" view. Pure so tone/label mapping is
// unit-tested; tolerant of an empty payload.

/** Count badge tone for a module/head status. */
export function statusTone(status) {
  return { error: 'c', warn: 'w', info: 'g', clean: 'g', dormant: 'd', system: 'd', engine: 'g' }[status] || 'g';
}

/** Badge text for the sidebar count. */
export function countLabel(status, count) {
  if (status === 'system' || status === 'dormant') return '—';
  return count > 0 ? String(count) : '✓';
}

/** Severity → shared Badge tone (for issue chips). */
export function sevTone(sev) {
  return { error: 'danger', warn: 'warning', info: 'info', dormant: 'neutral', system: 'neutral', engine: 'success', good: 'success' }[sev] || 'neutral';
}
export function sevLabel(sev) {
  return { error: 'critical', warn: 'review', info: 'info', dormant: 'dormant', system: 'system', engine: 'engine', good: 'clean' }[sev] || sev;
}

export function heads(d) { return (d && d.heads) || []; }

/** Group KPI tiles from the payload. */
export function moduleKpis(d) {
  const g = (d && d.group) || {};
  const all = heads(d).flatMap((h) => h.modules || []);
  return {
    errors: g.errors || 0, warnings: g.warnings || 0, info: g.info || 0,
    dormant: all.filter((m) => m.status === 'dormant').length,
    modules: all.length,
  };
}

/** Flatten open issues (optionally within one head/module) for the main panel, errors first. */
export function issuesFor(d, sel) {
  const rank = { error: 0, warn: 1, info: 2, engine: 3, good: 4, dormant: 5, system: 6 };
  let rows = [];
  if (sel && sel.module) {
    rows = (sel.module.issues || []).map((i) => ({ ...i }));
  } else {
    const hs = sel && sel.head ? [sel.head] : heads(d);
    hs.forEach((h) => (h.modules || []).forEach((m) => (m.issues || []).forEach((i) => {
      if (i.sev === 'error' || i.sev === 'warn' || i.sev === 'info') rows.push({ ...i, mod: m.name });
    })));
  }
  return rows.sort((a, b) => (rank[a.sev] ?? 9) - (rank[b.sev] ?? 9));
}
