import { apiGet, apiPost } from '../../../core/api';

// Current control-flag state (read-only). Stays resilient (never throws) so its many
// read-only consumers keep working, but a failure is now DISTINGUISHABLE via `_error` — an
// all-off `{flags:{}}` on load failure must not read as a genuinely dormant system (a screen
// can't say "Everything OFF" when it actually couldn't load). Consumers that don't care ignore it.
export async function getFlagState() {
  try {
    return (await apiGet('/api/tk/flags')) || { flags: {}, enabled: [] };
  } catch (e) {
    return { flags: {}, enabled: [], _error: (e && e.message) || 'Could not load control flags.' };
  }
}

// Propose a new flag map — goes through the change-request flow (Farhan + Owner),
// it does NOT flip the flag directly.
export async function proposeFlags(flags) {
  return apiPost('/api/tk/change-requests', { type: 'flag', payload: { after: { flags } } });
}

// Owner-only LIVE flip — applies the flag immediately (self-approved) and returns the
// new flag state ({ flags, enabled }), same shape as getFlagState so it can be dropped
// straight into the query cache. `branch` (a code) flips that branch's override;
// null/'default' flips the global value. Non-Owners are 403'd and use proposeFlags.
export async function setFlag(key, enabled, branch) {
  return apiPost('/api/tk/flags/set', { key, enabled, branch: branch || 'default' });
}

// Owner-only BULK flip — Enable all / Disable all for a branch scope in one request.
// `changes` = [{ key, enabled, branch }]. Returns the new flag state ({ flags, enabled }),
// same shape as getFlagState so it drops straight into the query cache.
export async function setManyFlags(changes) {
  return apiPost('/api/tk/flags/set-many', { changes });
}

// Read-only IMPACT PREVIEW — "what would this rule have caught?" over the last `days` of
// vouchers for a branch scope. Returns { impact: { count, amount, examples, note, ... } }.
export async function flagImpact(key, branch, days = 90) {
  return apiPost('/api/tk/flags/impact', { key, branch: branch || 'default', days });
}
