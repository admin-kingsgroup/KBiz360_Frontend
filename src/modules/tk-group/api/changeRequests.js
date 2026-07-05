import { apiGet, apiPost } from '../../../core/api';

// Governance change-requests (Faiz submits; Farhan/Owner act). The list route
// returns an envelope { data: rows } → apiGet unwraps it to the array.
export async function getChangeRequests(status = 'pending') {
  try {
    return (await apiGet('/api/tk/change-requests', { status })) || [];
  } catch {
    return [];
  }
}

/** Approve or reject a change-request (reject needs a reason). */
export async function actOnChangeRequest(id, action, reason = '') {
  return apiPost(`/api/tk/change-requests/${id}/act`, { action, reason });
}
