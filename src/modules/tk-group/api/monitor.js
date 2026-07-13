import { apiGet, apiPost } from '../../../core/api';

// Read-only control-plane monitoring.
//
// Two classes of getter, on purpose:
//  • Structural getters (overview, branches, audit, integrity/detail) fail SOFT to an
//    empty shape — they back auxiliary panels/drill-downs where a benign empty is fine.
//  • Roll-up getters (adoption, health, readiness, integrity, trend, scorecard) do NOT
//    swallow — a rejection must propagate so React Query sets `isError` and the dashboard
//    renders a real error state (BandError). Swallowing here made a backend outage read
//    as a FALSE "all healthy / 100 / 0% / flat". The consumers all guard `q.data || {}`,
//    so a propagated error never breaks the shell — it just flips to the error branch.
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
  return (await apiGet('/api/tk/monitor/adoption')) || {};
}
export async function getGroupHealth() {
  return (await apiGet('/api/tk/monitor/health')) || {};
}
export async function getSetupReadiness() {
  return (await apiGet('/api/tk/monitor/readiness')) || {};
}
// Roll-up getter (does NOT swallow): the Task List must show a real error state,
// never a false "all configured". One payload; branch/user scoping is client-side.
export async function getSetupTasks() {
  return (await apiGet('/api/tk/monitor/setup-tasks')) || {};
}
export async function getIntegrity() {
  return (await apiGet('/api/tk/monitor/integrity')) || {};
}
export async function getIntegrityDetail(branch, check) {
  try { return (await apiGet('/api/tk/monitor/integrity/detail', { branch, check })) || { rows: [] }; } catch { return { rows: [] }; }
}
export async function getTrend() {
  return (await apiGet('/api/tk/monitor/trend')) || {};
}
export async function getHealthScorecard() {
  return (await apiGet('/api/tk/monitor/scorecard')) || {};
}
export async function getModules() {
  return (await apiGet('/api/tk/monitor/modules')) || {};
}
export async function getFindingStatus() {
  try { return (await apiGet('/api/tk/finding-status'))?.items || []; } catch { return []; }
}
export function saveFindingStatus(row) { return apiPost('/api/tk/finding-status', row); }

// Dev Control tracking rows (owner/status/due per registry item) — feeds the
// Control Tower's Development lens. Same endpoint Dev Control itself uses, so a
// fix marked Done in /dev/control clears the Tower finding on the next read
// (and instantly in-session via the shared ['dev-control','status'] query key).
export async function getDevFindings() {
  try { return (await apiGet('/api/dev-control'))?.items || []; } catch { return []; }
}

// Live automated code scan — walks the ERP source trees on the backend and
// returns development findings (broken imports, dead routes, placeholder
// screens, dead buttons, TODOs…). Structural getter: fails SOFT to an empty
// shape so the Development lens still renders the build-time FE scan + registry
// findings if the backend can't reach the trees. `fresh` forces a re-scan
// (the "Re-scan now" button); the default read is served from a 60s cache.
export async function getCodeScan(fresh = false) {
  try {
    return (await apiGet('/api/dev-control/scan', fresh ? { fresh: 1 } : {}))
      || { roots: [], counts: { total: 0, bySeverity: {}, byCategory: {}, byTree: {} }, findings: [] };
  } catch {
    return { roots: [], counts: { total: 0, bySeverity: {}, byCategory: {}, byTree: {} }, findings: [], unreachable: true };
  }
}
