import { apiGet, apiPost } from '../../../core/api';

// Per-user approval-ceiling store, keyed by lower-cased email: { email: {default, branches} }.
export async function getUserLimits() {
  try {
    return (await apiGet('/api/tk/user-limits')) || { store: {} };
  } catch {
    return { store: {} };
  }
}

// The real user roster (name, role, branches, per-app access). Fails safe to [].
export async function getRoster() {
  try {
    const r = await apiGet('/api/user-access');
    return Array.isArray(r) ? r : (r && r.data) || [];
  } catch {
    return [];
  }
}

// Owner-only LIVE edit — sets a user's ceiling immediately (self-approved), returns the
// new store. `branch` null/'default' edits the user's default; a code edits that branch's
// override. A '' value clears (re-inherits / removes).
export async function setUserLimit(email, branch, value) {
  return apiPost('/api/tk/user-limits/set', { email, branch: branch || 'default', value });
}

// Non-owner: propose the ceiling change (Owner-approved, change-request type 'user_limit').
export async function proposeUserLimit(email, branch, value) {
  const b = branch || 'default';
  return apiPost('/api/tk/change-requests', { type: 'user_limit', branch: b === 'default' ? null : b, payload: { after: { email, branch: b, value } } });
}
