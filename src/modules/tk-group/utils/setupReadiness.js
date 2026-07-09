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

// ─── Module map (11 head modules · 75 sub-modules) ───────────────────────────
// The /readiness payload's `tree` carries every sub-module with its raw scored
// units (one per branch, or one Central). These helpers re-scope that tree to the
// selected branch and classify each module's need: manual configuration (live
// data-entry gaps), development (open dev-registry findings joined by module id),
// both, or none. All pure — unit-tested without a network.

/** The 11-head module tree from the API (empty until the payload arrives). */
export function moduleTreeHeads(d) {
  return (d && d.tree) || [];
}

/** Scope a module's units to one branch. Central units always apply — central
 *  config is shared, so it stays visible when a single branch is in focus. */
export function scopeUnits(units, branch) {
  const all = units || [];
  if (!branch || branch === 'ALL') return all;
  return all.filter((u) => u.branch === branch || u.scope === 'central');
}

/** Aggregate scored units into one health read (mirrors the backend rollup, so
 *  the FE can re-derive it for a branch slice). null health = no live meter. */
export function rollupUnits(units) {
  if (!units || !units.length) return { health: null, pct: null, liveUnits: 0, totalUnits: 0, missing: [] };
  const live = units.filter((u) => u.status === 'live').length;
  const dormant = units.filter((u) => u.status === 'dormant').length;
  const health = live === units.length ? 'live' : dormant === units.length ? 'dormant' : 'partial';
  const pct = Math.round(units.reduce((s, u) => s + (Number(u.pct) || 0), 0) / units.length);
  const byLabel = new Map();
  units.forEach((u) => (u.missing || []).forEach((label) => {
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(u.branch);
  }));
  const missing = [...byLabel.entries()].map(([label, branches]) => ({ label, branches }));
  return { health, pct, liveUnits: live, totalUnits: units.length, missing };
}

/** Module health chip: live green, partial amber, dormant red; modules without a
 *  live meter read by KIND (system / engine) — never a fake green. */
export function moduleHealthLabel(health, kind) {
  if (health === 'live') return 'Live';
  if (health === 'partial') return 'Partly set up';
  if (health === 'dormant') return 'Not started';
  return kind === 'sys' ? 'System' : kind === 'eng' ? 'Tower engine' : 'No live meter';
}
export function moduleHealthTone(health) {
  return { live: 'success', partial: 'warning', dormant: 'danger' }[health] || 'neutral';
}

/** What a module needs to be complete: manual configuration (data entry / setup
 *  by the team), development (open dev findings, dormant-by-design excluded),
 *  both, or none. */
export function moduleNeed({ health, config = [] }, devItems = []) {
  const needsConfig = health === 'partial' || health === 'dormant' || config.length > 0;
  const needsDev = devItems.some((i) => i.status !== 'dormant');
  return needsConfig && needsDev ? 'both' : needsConfig ? 'config' : needsDev ? 'dev' : 'none';
}
export function needLabel(need) {
  return { both: 'Config + Development', config: 'Manual configuration', dev: 'Development', none: 'Nothing needed' }[need] || '—';
}
export function needTone(need) {
  return { both: 'danger', config: 'warning', dev: 'info', none: 'success' }[need] || 'neutral';
}

/** One-line remark for a module row: the config gaps (with lagging branches when
 *  not all) and the open dev findings, in plain words. */
export function moduleRemark(row, devItems = []) {
  const parts = [];
  if (row.health === 'dormant') parts.push('No data entered yet on any branch.');
  if (row.missing && row.missing.length) {
    const gaps = row.missing.map((m) => (m.branches && m.branches.length && row.totalUnits > 1 ? `${m.label} (${m.branches.join(', ')})` : m.label));
    parts.push(`Missing: ${gaps.join(' · ')}`);
  }
  (row.config || []).forEach((c) => parts.push(`Awaiting setup: ${c.label} — ${c.note}`));
  const dev = devItems.filter((i) => i.status !== 'dormant');
  if (dev.length) parts.push(`Dev: ${dev.map((i) => i.name).join(' · ')}`);
  const dormantDev = devItems.filter((i) => i.status === 'dormant');
  if (dormantDev.length) parts.push('Built but switched off by design.');
  if (!parts.length) parts.push(row.health === 'live' ? 'All milestones met — nothing pending.' : 'Nothing tracked for this module.');
  return parts.join(' ');
}

/** Per-head rollup chips for the module map: how many live / partial / not
 *  started / needing dev, over the branch-scoped rows. */
export function headSummary(rows) {
  const c = { live: 0, partial: 0, dormant: 0, dev: 0 };
  rows.forEach((r) => {
    if (r.health) c[r.health] += 1;
    if (r.need === 'dev' || r.need === 'both') c.dev += 1;
  });
  return c;
}

/** Build the render-ready module map: heads → rows, re-scoped to the selected
 *  branch and joined with the open dev findings ({ moduleId: [items] }). */
export function moduleMapRows(d, branch, devByModule = {}) {
  return moduleTreeHeads(d).map((h) => {
    const rows = (h.modules || []).map((m) => {
      const units = scopeUnits(m.units, branch);
      const agg = rollupUnits(units);
      const devItems = devByModule[m.id] || [];
      const row = { ...m, ...agg, units, devItems };
      row.need = moduleNeed(row, devItems);
      row.remark = moduleRemark(row, devItems);
      return row;
    });
    return { head: h.head, rows, summary: headSummary(rows) };
  });
}
