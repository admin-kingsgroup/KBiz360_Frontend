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

// Owner-only LIVE flip — applies the flag immediately (self-approved) and returns the
// new flag state ({ flags, enabled }), same shape as getFlagState so it can be dropped
// straight into the query cache. Non-Owners are 403'd by the route and use proposeFlags.
export async function setFlag(key, enabled) {
  return apiPost('/api/tk/flags/set', { key, enabled });
}
