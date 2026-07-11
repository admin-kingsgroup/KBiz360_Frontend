import { apiGet, apiPost, apiDelete } from '../../core/api';

// ─── Tally Reconciliation (TB tie-out) · API ─────────────────────────────────
// Thin wrappers over /api/tally-tieout. The tie-out read THROWS on failure — a
// dead backend must never read as "everything ties" on a compliance board.

export function getTieOut({ branch, period, tier } = {}) {
  return apiGet('/api/tally-tieout', { branch, period, tier });
}
export async function getPeriods({ branch } = {}) {
  return (await apiGet('/api/tally-tieout/periods', { branch }))?.items || [];
}
// Certification register — every period + its cert status / sign chain / snapshot.
// Powers the Certification Register + Report pages. Fail-soft to an empty list.
export async function getRegister({ branch, tier } = {}) {
  try { return (await apiGet('/api/tally-tieout/register', { branch, tier }))?.items || []; }
  catch { return []; }
}
// Earliest posted date in the branch's books — drives the period selector's range
// (months/years back to the books' inception, not just the current period).
export async function getInception({ branch } = {}) {
  try { return (await apiGet('/api/accounting/inception', { branch }))?.from || null; }
  catch { return null; }
}
// Phase 2 — voucher drill for one off ledger + the classified Defect Register.
export function getLedgerVouchers({ branch, period, tier, ledger } = {}) {
  return apiGet('/api/tally-tieout/ledger', { branch, period, tier, ledger });
}
export function getDefects({ branch, period, tier } = {}) {
  return apiGet('/api/tally-tieout/defects', { branch, period, tier });
}
// Phase 3 — the Tally Reconciliation certificate (sign-off that gates the close).
export function getTallyCert({ branch, period, tier } = {}) {
  return apiGet('/api/tally-tieout/certificate', { branch, period, tier });
}
export function freezeTallyCert({ branch, period, tier }) {
  return apiPost('/api/tally-tieout/certificate/freeze', { branch, period, tier });
}
export function signTallyCert({ branch, period, tier }) {
  return apiPost('/api/tally-tieout/certificate/sign', { branch, period, tier });
}
// Re-open a certified period (Director/Owner) so corrected Tally data can be
// re-uploaded and the chain re-signed. Clears the signatures; requires a reason.
export function reopenTallyCert({ branch, period, tier, reason }) {
  return apiPost('/api/tally-tieout/certificate/reopen', { branch, period, tier, reason });
}
// Phase 4 — accept / un-accept an off ledger's difference (explained variance).
export function acceptVariance({ branch, period, tier, ledger, code, reason, note }) {
  return apiPost('/api/tally-tieout/accept', { branch, period, tier, ledger, code, reason, note });
}
export function clearVariance({ branch, period, tier, ledger }) {
  return apiDelete(`/api/tally-tieout/accept?branch=${encodeURIComponent(branch)}&period=${encodeURIComponent(period)}&tier=${encodeURIComponent(tier)}&ledger=${encodeURIComponent(ledger)}`);
}
export function importTB({ branch, period, tier, rows }) {
  return apiPost('/api/tally-tieout/import', { branch, period, tier, rows });
}
// Full Day Book upload (all ledgers at once) + how much is currently loaded.
export function importDayBook({ branch, period, tier, rows }) {
  return apiPost('/api/tally-tieout/daybook', { branch, period, tier, rows });
}
export async function getDayBookStatus({ branch, period, tier } = {}) {
  try { return (await apiGet('/api/tally-tieout/daybook', { branch, period, tier })) || { vouchers: 0, ledgers: 0 }; }
  catch { return { vouchers: 0, ledgers: 0 }; }
}
export function clearTB({ branch, period, tier = 'month' }) {
  return apiDelete(`/api/tally-tieout?branch=${encodeURIComponent(branch)}&period=${encodeURIComponent(period)}&tier=${encodeURIComponent(tier)}`);
}
// Remove a period's full Day Book upload (companion to clearTB — the "Clear Upload"
// button wipes both the TB and the Day Book for the selected month).
export function clearDayBook({ branch, period, tier = 'month' }) {
  return apiDelete(`/api/tally-tieout/daybook?branch=${encodeURIComponent(branch)}&period=${encodeURIComponent(period)}&tier=${encodeURIComponent(tier)}`);
}
