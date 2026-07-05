// ─── TK GROUP · FE · governance surfaces shaping (pure) ──────────────────────
// Targets & Budgets and Master / CoA control both file a Farhan + Owner change-request.

export const TARGET_METRICS = [
  { key: 'sales', label: 'Sales' },
  { key: 'gp', label: 'Gross Profit' },
  { key: 'budget', label: 'Expense Budget' },
  { key: 'np', label: 'Net Profit' },
];

export const MASTER_KINDS = [
  { key: 'add_head', label: 'Add ledger / CoA head' },
  { key: 'rename', label: 'Rename head' },
  { key: 'deactivate', label: 'Deactivate head' },
  { key: 'other', label: 'Other master change' },
];

export function metricLabel(key) {
  return (TARGET_METRICS.find((m) => m.key === key) || {}).label || key;
}
export function masterKindLabel(key) {
  return (MASTER_KINDS.find((m) => m.key === key) || {}).label || key;
}

export function isValidPeriod(p) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(p || ''));
}

export function isTargetValid({ branch, period, metric, amount }) {
  return !!branch && isValidPeriod(period) && !!metric && Number(amount) > 0;
}

export function isMasterValid({ kind, target }) {
  return !!kind && !!target && !!String(target).trim();
}
