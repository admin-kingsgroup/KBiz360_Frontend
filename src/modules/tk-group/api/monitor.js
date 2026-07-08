import { apiGet, apiPost } from '../../../core/api';

// Read-only control-plane monitoring. All fail soft to empty shapes so a dashboard can
// never break the shell.
export async function getOverview() {
  try { return (await apiGet('/api/tk/monitor/overview')) || {}; } catch { return {}; }
}
export async function getBranchCockpit() {
  try { return (await apiGet('/api/tk/monitor/branches')) || { items: [] }; } catch { return { items: [] }; }
}
export async function getAudit(filter = {}) {
  try { return (await apiGet('/api/tk/monitor/audit', filter)) || { items: [] }; } catch { return { items: [] }; }
}
export async function getAdoption() {
  try { return (await apiGet('/api/tk/monitor/adoption')) || {}; } catch { return {}; }
}
export async function getGroupHealth() {
  try { return (await apiGet('/api/tk/monitor/health')) || {}; } catch { return {}; }
}
export async function getSetupReadiness() {
  try { return (await apiGet('/api/tk/monitor/readiness')) || {}; } catch { return {}; }
}
export async function getIntegrity() {
  try { return (await apiGet('/api/tk/monitor/integrity')) || {}; } catch { return {}; }
}
export async function getIntegrityDetail(branch, check) {
  try { return (await apiGet('/api/tk/monitor/integrity/detail', { branch, check })) || { rows: [] }; } catch { return { rows: [] }; }
}
export async function getTrend() {
  try { return (await apiGet('/api/tk/monitor/trend')) || {}; } catch { return {}; }
}
// NOTE: does NOT swallow errors (unlike the other getters) — the module tree must show a
// real error state, not a false "all clean", if the roll-up fails.
export async function getHealthScorecard() {
  try { return (await apiGet('/api/tk/monitor/scorecard')) || {}; } catch { return {}; }
}
export async function getModules() {
  return (await apiGet('/api/tk/monitor/modules')) || {};
}
export async function getFindingStatus() {
  try { return (await apiGet('/api/tk/finding-status'))?.items || []; } catch { return []; }
}
export function saveFindingStatus(row) { return apiPost('/api/tk/finding-status', row); }
