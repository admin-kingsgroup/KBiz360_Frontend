import { apiGet } from '../../../core/api';

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
