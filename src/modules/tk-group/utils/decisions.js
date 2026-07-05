// ─── TK GROUP · FE · decision stream shaping (pure) ──────────────────────────
// Mirrors the backend: Farhan disposes small credit/funds decisions; large ones (and
// all counterparty onboarding) escalate to the Owner. The threshold is shown to the
// proposer so they know when the Owner will be pulled in.

export const DECISION_THRESHOLD = 500000;

// The decision types a branch can raise. `amount` = whether an amount field applies.
export const DECISION_TYPES = [
  { key: 'credit_limit', label: 'Credit limit', amount: true, partyLabel: 'Customer', amountLabel: 'Proposed limit' },
  { key: 'funds_release', label: 'Funds release', amount: true, partyLabel: 'Payee / purpose', amountLabel: 'Amount' },
  { key: 'counterparty', label: 'Counterparty onboarding', amount: false, partyLabel: 'New party name', amountLabel: '' },
];

export function decisionTypeDef(key) {
  return DECISION_TYPES.find((d) => d.key === key) || null;
}

/** Who will need to sign, for the proposer's guidance. Counterparty is always dual;
 *  credit/funds escalate to the Owner above the threshold. */
export function approverHint(type, amount) {
  if (type === 'counterparty') return 'Farhan + Owner';
  return (Number(amount) || 0) > DECISION_THRESHOLD ? 'Farhan + Owner' : 'Farhan';
}

/** Is the form ready to submit? A party is always required; an amount is required only
 *  for the amount-bearing types. */
export function isDecisionValid({ type, party, amount }) {
  const def = decisionTypeDef(type);
  if (!def) return false;
  if (!party || !String(party).trim()) return false;
  if (def.amount && !(Number(amount) > 0)) return false;
  return true;
}

/** Human label for a decision request's status. */
export function statusLabel(status) {
  return ({ pending: 'Pending', approved: 'Approved', rejected: 'Rejected', applied: 'Approved' })[status] || status || '';
}
