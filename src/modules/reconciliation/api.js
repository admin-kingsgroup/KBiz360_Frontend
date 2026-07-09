import { apiGet, apiPost } from '../../core/api';

// ─── Reconciliation module · API ─────────────────────────────────────────────
// Thin wrappers over /api/reconciliation. Reads fail soft (lists → [] / null)
// so the hub renders without a backend; writes propagate errors for toasts.

// Data the user ACTS on (register tree, certificate, pending board, register
// list) THROWS on failure so the pages show a real error state — a dead backend
// must never read as "no data" / "nothing pending" on a compliance board.
// Purely decorative reads (summary cards, rulebook periods) stay fail-soft.
export function getTree({ branch, tier, period } = {}) {
  return apiGet('/api/reconciliation/tree', { branch, tier, period });
}

export function getCertificate(id) {
  return apiGet(`/api/reconciliation/${id}`);
}

export async function getPending({ branch } = {}) {
  return (await apiGet('/api/reconciliation/pending', { branch })) || { rows: [] };
}

export async function getList({ branch, tier, period } = {}) {
  return (await apiGet('/api/reconciliation', { branch, tier, period }))?.items || [];
}

export async function getSummary({ branch } = {}) {
  try { return (await apiGet('/api/reconciliation/summary', { branch })) || null; }
  catch { return null; }
}

export async function getRulebook({ branch } = {}) {
  try { return (await apiGet('/api/reconciliation/rulebook', { branch })) || null; }
  catch { return null; }
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
