import { apiGet, apiPost } from '../../../core/api';

// Current control-flag state (read-only).
export async function getFlagState() {
  try {
    return (await apiGet('/api/tk/flags')) || { flags: {}, enabled: [] };
  } catch {
    return { flags: {}, enabled: [] };
  }
}

// Propose a new flag map — goes through the change-request flow (Farhan + Owner),
// it does NOT flip the flag directly.
export async function proposeFlags(flags) {
  return apiPost('/api/tk/change-requests', { type: 'flag', payload: { after: { flags } } });
}
