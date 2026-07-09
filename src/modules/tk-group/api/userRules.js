import { apiGet, apiPost, apiPut, apiDelete } from '../../../core/api';

// User Rules Manager — OWNER only (the API enforces Super Admin). Per-user access
// rules; mirrors api/rules.js. Does NOT swallow errors — the screen must show a
// real error / owner-only state, not a false "no rules".
export async function getUserRules(params = {}) {
  return (await apiGet('/api/tk/user-rules', params))?.items || [];
}
export function createUserRule(rule) { return apiPost('/api/tk/user-rules', rule); }
export function updateUserRule(id, rule) { return apiPut(`/api/tk/user-rules/${id}`, rule); }
export function setUserRuleStatus(id, status) { return apiPost(`/api/tk/user-rules/${id}/status`, { status }); }
export function testUserRule(id) { return apiPost(`/api/tk/user-rules/${id}/test`, {}); }
export function deleteUserRule(id) { return apiDelete(`/api/tk/user-rules/${id}`); }
