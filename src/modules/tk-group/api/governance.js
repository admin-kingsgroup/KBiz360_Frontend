import { apiGet, apiPost } from '../../../core/api';

// Governance change-requests (targets/budgets, master/CoA control). Proposing files a
// Farhan + Owner change-request; the pending list is filtered from the central queue.
export async function proposeGovernance(type, branch, after) {
  return apiPost('/api/tk/change-requests', { type, branch, payload: { after } });
}

export async function getPendingByType(type) {
  try {
    const rows = await apiGet('/api/tk/change-requests', { status: 'pending' });
    return (Array.isArray(rows) ? rows : []).filter((r) => r && r.type === type);
  } catch {
    return [];
  }
}
