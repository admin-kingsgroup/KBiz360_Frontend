import { apiGet, apiPost } from '../../../core/api';

// Farhan's decision stream. A branch raises a decision (credit limit / funds release /
// counterparty onboarding); it flows into the change-request queue for Farhan (+ Owner
// for large ones) to act on. Reads fail soft to an empty list.
export async function submitDecision({ type, party, amount = 0, note = '', branch } = {}) {
  return apiPost('/api/tk/decisions', { type, party, amount, note, branch });
}

export async function getMyDecisions() {
  try {
    return (await apiGet('/api/tk/decisions/mine')) || { items: [] };
  } catch {
    return { items: [] };
  }
}
