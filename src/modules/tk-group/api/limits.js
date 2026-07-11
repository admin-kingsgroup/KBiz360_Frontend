import { apiGet, apiPost } from '../../../core/api';

const EMPTY = { store: { default: {}, branches: {} }, fields: [], defaults: {}, limits: {} };

// The branch-wise thresholds store + editor metadata + the effective limits for a
// branch. Returns { store:{default,branches}, fields, defaults, limits }. Fails safe.
export async function getLimits(branch) {
  try {
    return (await apiGet('/api/tk/limits', branch ? { branch } : {})) || EMPTY;
  } catch {
    return EMPTY;
  }
}

// Owner-only LIVE edit — applies immediately (self-approved) and returns the new store
// ({ store, fields, defaults, limits }), same shape as getLimits so it drops straight
// into the query cache. `branch` null/'default' edits the group default; a code edits
// that branch's overrides. A '' field value clears that override (re-inherits).
export async function setBranchLimits(branch, values) {
  return apiPost('/api/tk/limits/set', { branch: branch || 'default', values });
}

// Non-owner: propose the branch threshold change (Owner-approved, change-request
// type 'limits'). `branch` is sent both top-level (for chain resolution) and in the
// payload (for apply), so it merges into the branch-wise store on approval.
export async function proposeBranchLimits(branch, values) {
  const b = branch || 'default';
  return apiPost('/api/tk/change-requests', { type: 'limits', branch: b === 'default' ? null : b, payload: { after: { branch: b, values } } });
}
