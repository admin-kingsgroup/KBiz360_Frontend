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
// Phase 2 — voucher drill for one off ledger + the classified Defect Register.
export function getLedgerVouchers({ branch, period, tier, ledger } = {}) {
  return apiGet('/api/tally-tieout/ledger', { branch, period, tier, ledger });
}
export function getDefects({ branch, period, tier } = {}) {
  return apiGet('/api/tally-tieout/defects', { branch, period, tier });
}
export function importTB({ branch, period, tier, rows }) {
  return apiPost('/api/tally-tieout/import', { branch, period, tier, rows });
}
export function clearTB({ branch, period }) {
  return apiDelete(`/api/tally-tieout?branch=${encodeURIComponent(branch)}&period=${encodeURIComponent(period)}`);
}
