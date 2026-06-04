import { BOOKING_FILES_SEED } from '../../../core/helpers';
import { isoDate } from '../../../core/dates';

// Rolling 2-week window from today (recomputed each call so it tracks the real date).
export const getUpcomingTravel = async ({ limit = 5 } = {}) => {
  const now = new Date();
  const WINDOW_FROM = isoDate(now);
  const WINDOW_TO = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14));
  return (BOOKING_FILES_SEED || [])
    .filter((b) => {
      const dep = b.travelDate || b.departure;
      return dep && dep >= WINDOW_FROM && dep <= WINDOW_TO;
    })
    .sort((a, b) =>
      (a.travelDate || a.departure || '').localeCompare(b.travelDate || b.departure || ''),
    )
    .slice(0, limit);
};
