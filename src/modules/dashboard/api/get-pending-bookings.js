import { apiGet } from '../../../core/api';

const BLANK = { count: 0, sales: 0, purchase: 0, gp: 0 };

/**
 * SO/PO/GP pipeline totals for the dashboard tiles, split by lifecycle:
 *   pending  → not-yet-approved bookings  → "Pending Sales / Purchase / GP"
 *   approved → approved + posted bookings → "Approved Sales / Purchase / GP"
 *   rejected → declined bookings          → "Rejected Sales / Purchase / GP"
 * Branch-scoped. Falls back to zeros on error so one failed call never blanks
 * the dashboard.
 */
export async function getBookingSummary(branchCode) {
  try {
    const d = (await apiGet('/api/booking-orders/summary', { branch: branchCode })) || {};
    return {
      pending: { ...BLANK, ...(d.pending || {}) },
      approved: { ...BLANK, ...(d.approved || {}) },
      rejected: { ...BLANK, ...(d.rejected || {}) },
    };
  } catch {
    return { pending: { ...BLANK }, approved: { ...BLANK }, rejected: { ...BLANK } };
  }
}
