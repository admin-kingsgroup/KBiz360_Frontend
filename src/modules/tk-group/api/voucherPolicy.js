import { apiGet, apiPost } from '../../../core/api';

const EMPTY = { categories: [], defaults: {}, store: { default: {}, branches: {} }, effective: {} };

// The Enforcement Matrix store + category metadata + the effective policy per category.
export async function getVoucherPolicy(branch) {
  try {
    return (await apiGet('/api/tk/voucher-policy', branch ? { branch } : {})) || EMPTY;
  } catch {
    return EMPTY;
  }
}

// Owner-only LIVE edit — applies one matrix cell immediately (self-approved), returns
// { store, effective }. `branch` null/'default' edits the group default; a code edits
// that branch's override.
export async function setVoucherPolicy(branch, category, patch) {
  return apiPost('/api/tk/voucher-policy/set', { branch: branch || 'default', category, patch });
}

// Non-owner: propose the matrix change (Owner-approved, change-request type 'voucher_policy').
export async function proposeVoucherPolicy(branch, category, patch) {
  const b = branch || 'default';
  return apiPost('/api/tk/change-requests', { type: 'voucher_policy', branch: b === 'default' ? null : b, payload: { after: { branch: b, category, patch } } });
}
