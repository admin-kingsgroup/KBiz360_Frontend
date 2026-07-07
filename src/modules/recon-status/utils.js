// ─── Reconciliation Status · pure helpers ────────────────────────────────────

export const BRANCHES = ['BOM', 'AMD', 'BOMMB', 'NBO', 'DAR', 'FBM'];
export const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank' },
  { value: 'client', label: 'Client' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'other', label: 'Other' },
];

/** The month you'd normally be closing (previous calendar month), 'YYYY-MM'. */
export function defaultPeriod(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based
  return m === 0 ? `${y - 1}-12` : `${y}-${String(m).padStart(2, '0')}`;
}

/** Last calendar day of a 'YYYY-MM' period as 'YYYY-MM-DD' (the default reconciled-to date). */
export function periodEndDate(period) {
  const m = /^(\d{4})-(\d{2})$/.exec(period || '');
  if (!m) return '';
  const last = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  return `${m[1]}-${m[2]}-${String(last).padStart(2, '0')}`;
}

export function statusTone(status) {
  return status === 'reconciled' ? 'success' : 'warning';
}

/** Count reconciled / pending across the account rows. */
export function reconSummary(rows) {
  const reconciled = (rows || []).filter((r) => r.status === 'reconciled').length;
  return { total: (rows || []).length, reconciled, pending: (rows || []).length - reconciled };
}
