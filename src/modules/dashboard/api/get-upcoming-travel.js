import { apiGet } from '../../../core/api';
import { todayISO } from '../../../core/dates';
import { selectUpcomingTravel } from '../utils/transformers';

// Upcoming travel — LIVE from /api/booking-orders (no seed array). Prefers bookings
// with a travelDate in the next 14 days (soonest first); falls back to the most
// recent bookings when older data has no travelDate yet. Shaping is the pure
// selectUpcomingTravel transform (unit-tested).
export const getUpcomingTravel = async ({ limit = 5, branchCode } = {}) => {
  try {
    const bookings = (await apiGet('/api/booking-orders', branchCode ? { branch: branchCode } : {})) || [];
    return selectUpcomingTravel(bookings, todayISO(), 14, limit);
  } catch { return []; }
};
