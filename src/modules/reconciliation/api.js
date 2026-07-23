import { apiGet, apiPost, apiDelete } from '../../core/api';

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

// The FULL in-scope ledger checklist for a tier + its live status — every ledger
// that must reconcile this period, whether or not its certificate exists yet
// (un-generated ledgers come back status:'pending'). Powers the Reconciliation
// Hub full view. THROWS on failure — a dead backend must never read as "nothing
// pending" on a compliance board.
export function getScopeTree({ branch, tier, period } = {}) {
  return apiGet('/api/reconciliation/scope-tree', { branch, tier, period });
}

export function getCertificate(id) {
  return apiGet(`/api/reconciliation/${id}`);
}

export async function getPending({ branch } = {}) {
  return (await apiGet('/api/reconciliation/pending', { branch })) || { rows: [] };
}

// Weekly coverage for a Month-End close — the month's weekly cycles, signed vs
// skipped (the Month-End register's soft "weeks skipped" warning).
export async function getWeeklyCoverage({ branch, period } = {}) {
  return (await apiGet('/api/reconciliation/weekly-coverage', { branch, period })) || { weeks: [], unsigned: 0 };
}

// TK Group Central approval inbox — every frozen cert awaiting a signature, tagged
// with the role it waits on (+ `me` = the signed-in role). THROWS on failure — a
// dead backend must never read as "no approvals pending" on a compliance board.
export function getInbox({ branch } = {}) {
  return apiGet('/api/reconciliation/inbox', { branch });
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
// ── Freeze-from-screen (Statement Matching "Freeze" tab) ─────────────────────
// Per-ledger freeze straight off a matching screen: read the freeze state (status +
// unreconciled-entry count so the button can disable with a reason), freeze one
// ledger for a period — tier daily/weekly/month (BE refuses unless every entry is
// reconciled), or un-freeze (SOFT-lock release while unsigned; the release path the
// revoke lock guard points to, for ANY frozen tier). Ledger keyed by CODE or NAME.
export async function getLedgerFreeze({ branch, code, name, period, tier = 'month' } = {}) {
  // apiGet's response interceptor already unwraps the { success, data } envelope,
  // so this resolves to the freeze-state object directly — do NOT re-read `.data`
  // (that always yielded undefined → null and left the Freeze panel non-functional).
  try { return (await apiGet('/api/reconciliation/ledger-freeze', { branch, code, name, period, tier })) || null; }
  catch { return null; }
}
export function freezeLedger({ branch, code, name, period, tier = 'month', statementBalance, adjustments }) {
  return apiPost('/api/reconciliation/ledger-freeze', { branch, code, name, period, tier, statementBalance, adjustments });
}
export function unfreezeLedger({ branch, code, name, period, tier = 'month' }) {
  return apiPost('/api/reconciliation/ledger-unfreeze', { branch, code, name, period, tier });
}
// Inter-Branch pair freeze (no per-ledger cert — a branch-pair balance agreement).
// One call → every pair's month-scoped agreement + freeze/signing state (avoids N× reconcile).
export async function getIbFreezeAll({ period } = {}) {
  // Envelope already unwrapped by the interceptor → resolves to the pair-status ARRAY
  // directly. Re-reading `.data` here always gave [] and left every pair's freeze state blank.
  try { return (await apiGet('/api/interbranch-reconciliation/freeze/status-all', { period })) || []; }
  catch { return []; }
}
export async function getIbFreeze({ branchA, branchB, period } = {}) {
  try { return (await apiGet('/api/interbranch-reconciliation/freeze', { branchA, branchB, period })) || null; }
  catch { return null; }
}
export function ibUnfreeze({ branchA, branchB, period }) {
  return apiPost('/api/interbranch-reconciliation/freeze/unfreeze', { branchA, branchB, period });
}
export function ibFreeze({ branchA, branchB, period }) {
  return apiPost('/api/interbranch-reconciliation/freeze', { branchA, branchB, period });
}
export function ibFreezeSign({ branchA, branchB, period }) {
  return apiPost('/api/interbranch-reconciliation/freeze/sign', { branchA, branchB, period });
}
export function ibFreezeReopen({ branchA, branchB, period, reason }) {
  return apiPost('/api/interbranch-reconciliation/freeze/reopen', { branchA, branchB, period, reason });
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
// Bulk: one write for select-all classify/confirm.
export function scrutinyBulkAction(id, { entryIds, action, classification }) {
  return apiPost(`/api/reconciliation/${id}/scrutiny/bulk`, { entryIds, action, classification });
}
// Re-match the stored statement rows against the CURRENT books (after posting
// a missing charge) — no re-upload needed.
export function rerunScrutiny(id) {
  return apiPost(`/api/reconciliation/${id}/scrutiny/rerun`);
}
// Weekly cycle-ledger config: wallets / gateway ledgers joining the weekly cycle.
export async function getCycleLedgers({ branch } = {}) {
  return (await apiGet('/api/reconciliation/cycle-ledgers', { branch }))?.items || [];
}
export function addCycleLedger({ branch, code }) {
  return apiPost('/api/reconciliation/cycle-ledgers', { branch, code });
}
export function removeCycleLedger({ branch, code }) {
  return apiDelete(`/api/reconciliation/cycle-ledgers/${encodeURIComponent(code)}?branch=${encodeURIComponent(branch)}`);
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
