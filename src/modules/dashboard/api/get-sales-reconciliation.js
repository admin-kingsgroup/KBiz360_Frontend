import { apiGet } from '../../../core/api';

// Empty shell so a failed call never blanks the dashboard card.
const EMPTY_RECON = { revenue: 0, buckets: [], bucketSum: 0, residual: 0, reconciles: true };

/**
 * Sales reconciliation for the dashboard bridge card:
 *   Revenue = SO/PO/GP + INB − Refund/Reissue (+ Other/Manual)
 * Sourced from the SAME Sales-Accounts postings as the Revenue KPI, so it foots to
 * that card to the rupee. `residual`/`reconciles` flag any drift (a stray manual
 * posting to a Sales ledger surfaces in the "Other" bucket instead of breaking the sum).
 * Branch + period scoped; returns zeros on error.
 */
export async function getSalesReconciliation({ branchCode, from, to } = {}) {
  try {
    return (await apiGet('/api/accounting/sales-reconciliation', { branch: branchCode, from, to })) || EMPTY_RECON;
  } catch {
    return EMPTY_RECON;
  }
}
