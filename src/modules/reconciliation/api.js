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
// The BOOK side is auto-fetched from ERP Books server-side and LOCKED — only
// the statement figure and the reconciling items are ever sent.
export function freezeSnapshot(id, { statementBalance, adjustments }) {
  return apiPost(`/api/reconciliation/${id}/snapshot`, { statementBalance, adjustments });
}
// Statement attach: multipart when a file (PDF/CSV/image/XML) is chosen —
// stored in the private S3 bucket, tamper-tied to its content sha256.
export function addAttachment(id, { label, source, file }) {
  const form = new FormData();
  form.append('label', label);
  form.append('source', source);
  if (file) form.append('file', file, file.name);
  return apiPost(`/api/reconciliation/${id}/attachments`, form);
}
export async function getAttachmentUrl(id, attId) {
  return apiGet(`/api/reconciliation/${id}/attachments/${attId}/url`);
}
// Statement Scrutiny: parsed rows (HTML/TXT/CSV/Excel are read client-side) →
// entry-to-entry match against the ledger, stored on the certificate.
export function scrutinizeStatement(id, { attachmentId, fileName, rows, statementClosing }) {
  return apiPost(`/api/reconciliation/${id}/scrutinize`, { attachmentId, fileName, rows, statementClosing });
}
export function scrutinyEntryAction(id, entryId, { action, classification }) {
  return apiPost(`/api/reconciliation/${id}/scrutiny/entries/${entryId}`, { action, classification });
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
