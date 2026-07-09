import { apiGet, apiPost } from '../../core/api';

// ─── Reconciliation module · API ─────────────────────────────────────────────
// Thin wrappers over /api/reconciliation. Reads fail soft (lists → [] / null)
// so the hub renders without a backend; writes propagate errors for toasts.

// The register tree and single certificate THROW on failure so the pages can
// show a real error state (a dead backend must not read as "no data").
export function getTree({ branch, tier, period } = {}) {
  return apiGet('/api/reconciliation/tree', { branch, tier, period });
}

export function getCertificate(id) {
  return apiGet(`/api/reconciliation/${id}`);
}

export async function getSummary({ branch } = {}) {
  try { return (await apiGet('/api/reconciliation/summary', { branch })) || null; }
  catch { return null; }
}

export async function getRulebook({ branch } = {}) {
  try { return (await apiGet('/api/reconciliation/rulebook', { branch })) || null; }
  catch { return null; }
}

export async function getPending({ branch } = {}) {
  try { return (await apiGet('/api/reconciliation/pending', { branch })) || { rows: [] }; }
  catch { return { rows: [] }; }
}

export async function getList({ branch, tier, period } = {}) {
  try { return (await apiGet('/api/reconciliation', { branch, tier, period }))?.items || []; }
  catch { return []; }
}

export function generateCertificates({ branch, tier, period, codes }) {
  return apiPost('/api/reconciliation/generate', { branch, tier, period, codes });
}
export function freezeSnapshot(id, { bookBalance, statementBalance, adjustments }) {
  return apiPost(`/api/reconciliation/${id}/snapshot`, { bookBalance, statementBalance, adjustments });
}
export function addAttachment(id, { label, source, fileName }) {
  return apiPost(`/api/reconciliation/${id}/attachments`, { label, source, fileName });
}
export function addException(id, text) {
  return apiPost(`/api/reconciliation/${id}/exceptions`, { text });
}
export function resolveException(id, exId) {
  return apiPost(`/api/reconciliation/${id}/exceptions/${exId}/resolve`);
}
export function signCertificate(id) {
  return apiPost(`/api/reconciliation/${id}/sign`);
}
export function attachScan(id, fileName) {
  return apiPost(`/api/reconciliation/${id}/scan`, { fileName });
}
