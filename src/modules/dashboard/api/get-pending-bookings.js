import { apiGet } from '../../../core/api';

/**
 * Pending SO/PO/GP pipeline totals — the dashboard's "Pending Sales / Purchase /
 * GP" tiles. Sourced from bookings still in `status: 'pending'` (not yet
 * approved/posted), so it reflects value sitting in the approval queue. Falls
 * back to zeros on error so one failed call never blanks the dashboard.
 */
export async function getPendingBookingSummary(branchCode) {
  try {
    return (
      (await apiGet('/api/booking-orders/summary', { branch: branchCode })) || {
        count: 0, sales: 0, purchase: 0, gp: 0,
      }
    );
  } catch {
    return { count: 0, sales: 0, purchase: 0, gp: 0 };
  }
}
