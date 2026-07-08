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
