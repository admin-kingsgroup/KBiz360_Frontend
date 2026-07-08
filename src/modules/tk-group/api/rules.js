import { apiGet, apiPost, apiPut, apiDelete } from '../../../core/api';

// Rules Manager — OWNER only (the API enforces Super Admin). Reads fail soft to empty;
// writes surface errors to the caller so the form can show them.
export async function getRules(params = {}) {
  try { return (await apiGet('/api/tk/rules', params))?.items || []; } catch { return []; }
}
export function createRule(rule) { return apiPost('/api/tk/rules', rule); }
export function updateRule(id, rule) { return apiPut(`/api/tk/rules/${id}`, rule); }
export function setRuleStatus(id, status) { return apiPost(`/api/tk/rules/${id}/status`, { status }); }
export function testRule(id) { return apiPost(`/api/tk/rules/${id}/test`, {}); }
export function deleteRule(id) { return apiDelete(`/api/tk/rules/${id}`); }
