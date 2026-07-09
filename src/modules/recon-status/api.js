import { apiGet, apiPost, apiDelete } from '../../core/api';

// Reconciliation Status — the team's manual tracker. Reads fail soft to empty so the
// screen never breaks; writes surface errors to the caller.
export async function getReconList({ branch, period } = {}) {
  try { return (await apiGet('/api/recon-status', { branch, period }))?.items || []; } catch { return []; }
}
export function saveRecon(row) { return apiPost('/api/recon-status', row); }
export function deleteRecon(id) { return apiDelete(`/api/recon-status/${id}`); }
