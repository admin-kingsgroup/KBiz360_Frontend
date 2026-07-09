// ─── TK GROUP · FE · Rules Manager shaping (pure) ────────────────────────────

export const SCOPE_LEVELS = [
  { value: 'erp', label: 'Whole ERP' },
  { value: 'department', label: 'Department' },
  { value: 'module', label: 'Module' },
  { value: 'voucher', label: 'Voucher type' },
  { value: 'branch', label: 'Branch' },
];
export const SEVERITIES = [{ value: 'error', label: 'Block / Critical' }, { value: 'warn', label: 'Warning' }, { value: 'info', label: 'Info' }];
export const OPS = [{ value: 'set', label: 'must be set' }, { value: '>', label: '> value' }, { value: '>=', label: '≥ value' }, { value: '==', label: '= value' }, { value: '!=', label: '≠ value' }];

/** Badge tone for a rule status. */
export function statusTone(status) {
  return { active: 'success', draft: 'neutral', inactive: 'neutral', pending: 'warning' }[status] || 'neutral';
}
export function statusLabel(status) {
  return { active: '● Active', draft: '○ Draft', inactive: '○ Inactive', pending: '◔ Pending' }[status] || status;
}
export function sevTone(sev) { return { error: 'danger', warn: 'warning', info: 'info' }[sev] || 'neutral'; }
export function scopeLabel(scope) {
  if (!scope) return '';
  const lvl = (SCOPE_LEVELS.find((s) => s.value === scope.level) || {}).label || scope.level;
  return scope.ref && scope.ref !== 'all' && scope.ref !== '' ? `${lvl} · ${scope.ref}` : lvl;
}

/** Summary counts for the header. */
export function ruleKpis(rows) {
  const r = rows || [];
  return {
    total: r.length,
    active: r.filter((x) => x.status === 'active').length,
    draft: r.filter((x) => x.status === 'draft' || x.status === 'inactive').length,
    system: r.filter((x) => x.system).length,
  };
}

/** Next status action for a row (what the button does). */
export function toggleTarget(status) { return status === 'active' ? 'inactive' : 'active'; }

/** A rule is "common" when it applies to every branch (no scope.branches, empty, or 'ALL'). */
export function isCommonRule(rule) {
  const b = rule && rule.scope && rule.scope.branches;
  return !Array.isArray(b) || b.length === 0 || b.includes('ALL');
}

/**
 * Split rules into Common (all-branch) + per-branch sections.
 * A rule naming several branches appears under each. branchOrder pins the
 * section order (unknown codes go last, alphabetically).
 */
export function groupRulesByBranch(rows, branchOrder = []) {
  const common = [];
  const map = new Map();
  for (const r of rows || []) {
    if (isCommonRule(r)) { common.push(r); continue; }
    for (const b of r.scope.branches) {
      if (!map.has(b)) map.set(b, []);
      map.get(b).push(r);
    }
  }
  const pos = (b) => { const i = branchOrder.indexOf(b); return i === -1 ? branchOrder.length : i; };
  const branches = [...map.keys()]
    .sort((a, b) => pos(a) - pos(b) || a.localeCompare(b))
    .map((branch) => ({ branch, rules: map.get(branch) }));
  return { common, branches };
}
