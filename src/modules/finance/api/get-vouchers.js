import { apiGet } from '../../../core/api';

/**
 * Voucher register accessor — LIVE list of vouchers for one category.
 *   GET /api/vouchers?branch=&category=&from=&to=
 *
 * category ∈ receipt | payment | contra | journal | sale | purchase
 * Returns the raw voucher array (each: { vno, type, category, branch, date,
 * party, billTo, counterParty, lines[], total, subtotal, status, remarks, … }).
 * api/ never transforms — the service maps these into register rows.
 */
export const getVouchers = ({ branch, category, from, to } = {}) =>
  apiGet('/api/vouchers', { branch, category, from, to });
