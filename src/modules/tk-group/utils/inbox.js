// ─── TK GROUP · FE · approvals inbox — pure shaping ──────────────────────────
// Turns the /api/tk/inbox payload into what the badge + panel render. Pure, so it
// unit-tests without a DOM or network.

const LABELS = {
  config: 'Config change',
  flag: 'Flag change',
  period_lock: 'Period lock',
  master: 'Master change',
  credit_policy: 'Credit policy',
  credit: 'Credit',
  voucher: 'Voucher',
  // Farhan's decision stream
  credit_limit: 'Credit limit',
  funds_release: 'Funds release',
  counterparty: 'Counterparty onboarding',
};

/** Human label for a change-request type. */
export function typeLabel(type) {
  return LABELS[type] || type || 'Change';
}

/** Normalise the inbox payload → { count, items, byType }. */
export function inboxSummary(data) {
  const items = (data && Array.isArray(data.items) ? data.items : []);
  const count = typeof (data && data.count) === 'number' ? data.count : items.length;
  const byType = items.reduce((m, it) => {
    const t = (it && it.type) || 'other';
    m[t] = (m[t] || 0) + 1;
    return m;
  }, {});
  return { count, items, byType };
}

/** What the badge shows: '' when empty, capped at 99+. */
export function badgeText(count) {
  const n = Number(count) || 0;
  if (n <= 0) return '';
  return n > 99 ? '99+' : String(n);
}
