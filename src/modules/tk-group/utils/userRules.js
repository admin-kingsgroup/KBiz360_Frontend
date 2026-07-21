// ─── TK GROUP · FE · User Rules Manager shaping (pure) ───────────────────────
// Sibling to utils/rules.js. Keeps status/severity tone helpers identical so the
// two managers read the same; adds the user-access vocabulary (subject, constraint).

// Who a rule applies to.
export const SUBJECT_KINDS = [
  { value: 'user', label: 'A specific user' },
  { value: 'role', label: 'A role' },
  { value: 'all', label: 'Everyone' },
];

// What dimension of access the rule governs. `needs` drives which extra input the
// form shows: 'values' = a value list, 'limit' = a number, 'window' = from/to times.
export const CONSTRAINT_KINDS = [
  { value: 'branch', label: 'Branch access', needs: 'values', ph: 'BOM, AMD' },
  { value: 'module', label: 'Module access', needs: 'values', ph: 'sales, purchase' },
  { value: 'permission', label: 'Permission / action', needs: 'values', ph: 'approve, delete' },
  { value: 'approval-limit', label: 'Approval limit', needs: 'limit', ph: '100000' },
  { value: 'view-only', label: 'View-only (read-only)', needs: 'none', ph: '' },
  { value: 'time-window', label: 'Login time window', needs: 'window', ph: '' },
];

export const EFFECTS = [
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
  { value: 'limit', label: 'Limit to' },
];

export const SEVERITIES = [
  { value: 'error', label: 'Enforce / Block' },
  { value: 'warn', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

export const BRANCH_CODES = ['BOM', 'AMD', 'MHUB', 'NBO', 'DAR', 'FBM'];

// Shared tone/label helpers — kept in step with utils/rules.js on purpose.
export function statusTone(status) {
  return { active: 'success', draft: 'neutral', inactive: 'neutral', pending: 'warning' }[status] || 'neutral';
}
export function statusLabel(status) {
  return { active: '● Active', draft: '○ Draft', inactive: '○ Inactive', pending: '◔ Pending' }[status] || status;
}
export function sevTone(sev) { return { error: 'danger', warn: 'warning', info: 'info' }[sev] || 'neutral'; }

/** Human label for who a rule targets. */
export function subjectLabel(subject) {
  if (!subject) return '';
  if (subject.kind === 'all') return 'Everyone';
  const lbl = (SUBJECT_KINDS.find((s) => s.value === subject.kind) || {}).label || subject.kind;
  return subject.ref ? `${subject.kind === 'role' ? 'Role' : 'User'} · ${subject.ref}` : lbl;
}

/** Human label for the access a rule grants/withholds, e.g. "Deny branch · AMD, DAR". */
export function constraintLabel(c) {
  if (!c) return '';
  const kind = (CONSTRAINT_KINDS.find((k) => k.value === c.kind) || {}).label || c.kind;
  const eff = (EFFECTS.find((e) => e.value === c.effect) || {}).label || c.effect;
  if (c.kind === 'approval-limit') return `${eff} ${c.limit ?? ''}`.trim();
  if (c.kind === 'view-only') return kind;
  if (c.kind === 'time-window') return `${kind} ${c.from || ''}–${c.to || ''}`.trim();
  const vals = (c.values || []).join(', ');
  return `${eff} ${kind.toLowerCase()}${vals ? ` · ${vals}` : ''}`;
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

/** What the constraint kind requires as input ('values' | 'limit' | 'window' | 'none'). */
export function constraintNeeds(kind) {
  return (CONSTRAINT_KINDS.find((k) => k.value === kind) || {}).needs || 'none';
}
