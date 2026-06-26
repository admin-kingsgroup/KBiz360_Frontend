import * as api from '../api';
import { normalizeTrialBalanceRow, trialBalanceTotals, toVoucherRegisterRow } from '../utils/transformers';

/**
 * Finance service — the only place that orchestrates `api/*` accessors and runs
 * transformers. Hooks call into the service, never the api layer directly, so
 * business logic stays out of React.
 *
 * Layering: pages → hooks → services → api → core/api → backend
 */

/**
 * Load + normalise the live Trial Balance for a branch + period.
 * Returns a UI-ready shape: flat normalised rows + column totals + a balanced
 * flag derived from the FULL set (so a search filter can never falsely report
 * "out of balance").
 */
export const loadTrialBalance = async ({ branch, from, to, includeZero } = {}) => {
  const data = await api.getTrialBalance({ branch, from, to, includeZero });
  const rows = (data?.rows || []).map(normalizeTrialBalanceRow);
  const totals = trialBalanceTotals(rows);

  // Prefer the server's grand totals; fall back to the computed ones (and to the
  // legacy debit/credit fields a not-yet-redeployed backend may still send).
  const grandDr = data?.totalClosingDebit ?? data?.totalDebit ?? totals.closingDebit;
  const grandCr = data?.totalClosingCredit ?? data?.totalCredit ?? totals.closingCredit;

  return {
    rows,
    totals,
    grandClosingDebit: Math.round(grandDr || 0),
    grandClosingCredit: Math.round(grandCr || 0),
    balanced: data?.balanced ?? Math.abs((grandDr || 0) - (grandCr || 0)) < 1,
  };
};

/**
 * Load a voucher register (receipt / payment / contra / journal) for a branch +
 * period, mapped into flat register rows. The page renders these in a DataTable.
 */
export const loadVoucherRegister = async ({ branch, category, from, to } = {}) => {
  const rows = await api.getVouchers({ branch, category, from, to });
  // GET /api/vouchers returns EVERY status (no status filter is sent). A deleted
  // voucher is reversed out of the books and kept view-only, so it must NOT appear
  // in — or be summed into the total of — a register (a register reflects the live
  // books). Drop deleted entries so a deleted voucher leaves the register at once
  // (the actual Ledger A/c, which reads journals, already excludes them).
  return (rows || []).filter((v) => v.status !== 'deleted').map(toVoucherRegisterRow);
};
