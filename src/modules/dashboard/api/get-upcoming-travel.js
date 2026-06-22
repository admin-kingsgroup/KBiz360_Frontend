import { apiGet } from '../../../core/api';

// Upcoming / recent travel — LIVE from /api/booking-orders (no seed array).
// Bookings don't yet carry a discrete travel/departure date (the `date` field is the
// booking date), so we surface the most recent bookings for the branch. When a
// travelDate is later captured on the booking, switch the sort/filter to that field —
// the row shape here already exposes `travelDate`.
export const getUpcomingTravel = async ({ limit = 5, branchCode } = {}) => {
  try {
    const bookings = (await apiGet('/api/booking-orders', branchCode ? { branch: branchCode } : {})) || [];
    return bookings
      .slice()
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, limit)
      .map((b) => ({
        id: b._id || b.bookingNo || b.linkNo,
        client: b.customer || 'Client',
        destination: b.headerRef || '',
        mod: b.module || '',
        travelDate: b.date || '',
        pax: Array.isArray(b.rows) ? b.rows.length : 1,
      }));
  } catch { return []; }
};
