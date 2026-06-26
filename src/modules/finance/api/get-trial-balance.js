import { apiGet } from '../../../core/api';

/**
 * Trial Balance accessor — LIVE from the double-entry engine.
 *   GET /api/accounting/trial-balance?branch=&from=&to=
 *
 * Returns the raw backend envelope payload:
 *   { filter, rows:[{ ledger, code, group, openingDebit, openingCredit,
 *                      debit, credit, closingDebit, closingCredit }],
 *     totalOpeningDebit, totalOpeningCredit, totalDebit, totalCredit,
 *     totalClosingDebit, totalClosingCredit, balanced }
 *
 * api/ modules return plain data and never transform — normalisation happens in
 * the service. `branch` is the backend branch code (or undefined for ALL).
 */
export const getTrialBalance = ({ branch, from, to, includeZero } = {}) =>
  apiGet('/api/accounting/trial-balance', { branch, from, to, includeZero: includeZero || undefined });
