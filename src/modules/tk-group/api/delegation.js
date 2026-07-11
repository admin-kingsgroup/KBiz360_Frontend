import { apiGet, apiPost } from '../../../core/api';

// Delegation of approval authority (Owner-granted). Fails soft to an empty list.
export async function getDelegations() {
  try {
    return (await apiGet('/api/tk/delegations')) || { items: [], activeCount: 0 };
  } catch {
    return { items: [], activeCount: 0 };
  }
}
export async function createDelegation(body) { return apiPost('/api/tk/delegations', body); }
export async function revokeDelegation(id) { return apiPost(`/api/tk/delegations/${id}/revoke`); }
