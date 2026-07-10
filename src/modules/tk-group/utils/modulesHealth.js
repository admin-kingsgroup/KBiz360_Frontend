import { moduleMapRows } from './setupReadiness';

// ─── TK GROUP · FE · Modules Health scorecard (pure — unit-tested without React) ──
// Head-module scorecards over the live readiness tree (11 heads · 75 sub-modules):
// each head gets a composite health score (average pct of its METERED sub-modules —
// sys/eng machinery without a live meter never drags a score), a letter grade and a
// live/partial/dormant tally; clicking a card drills into every sub-module's own
// health. Rides moduleMapRows, so branch scoping and dev-finding joins behave
// exactly like the Setup Readiness module map.

/** Composite score for one head: average pct across metered rows; null if none. */
export function headScore(rows = []) {
  const metered = rows.filter((r) => r.pct != null);
  if (!metered.length) return null;
  return Math.round(metered.reduce((s, r) => s + (Number(r.pct) || 0), 0) / metered.length);
}

/** Letter grade for a score. null (no meter) → '—'. */
export function gradeOf(score) {
  if (score == null) return '—';
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'E';
}

/** Badge tone for a score band (matches the grade colours). */
export function scoreTone(score) {
  if (score == null) return 'neutral';
  if (score >= 75) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}

/** Render-ready scorecards: one per head, with score/grade/tally + drill rows. */
export function headCards(d, branch = 'ALL', devByModule = {}) {
  return moduleMapRows(d, branch, devByModule).map((h) => {
    const score = headScore(h.rows);
    return {
      head: h.head,
      score,
      grade: gradeOf(score),
      tally: h.summary,                                  // { live, partial, dormant, dev }
      metered: h.rows.filter((r) => r.pct != null).length,
      total: h.rows.length,
      rows: h.rows,
    };
  });
}

/** Readable steps: exactly what to do to take one sub-module to 100%.
 *  Built from its missing live milestones (with the branches still lagging),
 *  its awaiting-setup config items, and its open dev findings — in the order
 *  the team should act. Each step carries the deep-link to WHERE it is done
 *  (milestones publish their own entry screens via the readiness engine).
 *  An already-live module says so; meterless system / engine machinery honestly
 *  says there is nothing to score. Returns [{ text, link }]. */
export function howTo100(row = {}) {
  const steps = [];
  if (row.health === 'live') {
    return [{ text: 'Already at 100% — every milestone is met. Nothing to do; keep it live.', link: '' }];
  }
  if (row.pct == null && !(row.config || []).length && !(row.devItems || []).length) {
    return [{
      text: row.kind === 'sys' || row.kind === 'eng'
        ? 'System machinery — runs on its own, no health meter and nothing to configure.'
        : 'No live meter yet — health will appear once this module gets countable milestones.',
      link: '',
    }];
  }
  (row.missing || []).forEach((m) => {
    const where = (m.branches || []).length ? ` — still missing in ${m.branches.join(', ')}` : '';
    steps.push({ text: `Complete "${m.label}"${where}.`, link: m.link || row.link || '' });
  });
  (row.config || []).forEach((c) => {
    steps.push({ text: `Set up: ${c.label}${c.note ? ` — ${c.note}` : ''}`, link: c.link || '' });
  });
  (row.devItems || []).filter((i) => i.status !== 'dormant').forEach((i) => {
    steps.push({ text: `Development: ${i.name} — ${i.remark || i.note || 'see Dev Control'} (clear it in Dev Control).`, link: '/dev/control' });
  });
  if (!steps.length) {
    steps.push({ text: 'Enter the module’s data via its screen — the meter fills as records land.', link: row.link || '' });
  }
  return steps;
}

/** Overall roll-up across every head — the top KPI tiles. */
export function overallHealth(cards = []) {
  const scored = cards.filter((c) => c.score != null);
  const score = scored.length
    ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length) : 0;
  const tally = { live: 0, partial: 0, dormant: 0, dev: 0 };
  let modules = 0;
  cards.forEach((c) => {
    modules += c.total;
    ['live', 'partial', 'dormant', 'dev'].forEach((k) => { tally[k] += c.tally[k] || 0; });
  });
  return { score, grade: gradeOf(scored.length ? score : null), modules, ...tally };
}
