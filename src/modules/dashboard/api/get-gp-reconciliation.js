import { apiGet } from '../../../core/api';

const EMPTY_GP_RECON = { gp: 0, buckets: [], bucketSum: 0, residual: 0, reconciles: true };

/**
 * Gross-Profit reconciliation for the dashboard bridge card:
 *   GP = SO/PO/GP + INB + Refund/Reissue + Commission/Adjustments (+ Other)
 * Sourced from the same 6 GP heads as the GP KPI, so it foots to that card to the
 * rupee. Unlike the sales bridge, the "Commission / Discounts / JV" bucket is material
 * (commission income booked via journal/debit-note lives there). Branch + period scoped;
 * returns zeros on error so a failed call never blanks the dashboard.
 */
export async function getGpReconciliation({ branchCode, from, to } = {}) {
  try {
    return (await apiGet('/api/accounting/gp-reconciliation', { branch: branchCode, from, to })) || EMPTY_GP_RECON;
  } catch {
    return EMPTY_GP_RECON;
  }
}
