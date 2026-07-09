import { apiGet, apiPost } from '../../core/api';

export async function getGstr2bList({ branch, period, status } = {}) {
  try { return (await apiGet('/api/gstr2b', { branch, period, status }))?.items || []; } catch { return []; }
}
export function importGstr2b(body) { return apiPost('/api/gstr2b/import', body); }
export function setGstr2bStatus(id, status, extra = {}) { return apiPost(`/api/gstr2b/status/${id}`, { status, ...extra }); }
