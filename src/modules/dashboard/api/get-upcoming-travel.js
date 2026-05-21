import { BOOKING_FILES_SEED } from '../../../core/helpers';

const WINDOW_FROM = '2026-05-19';
const WINDOW_TO = '2026-06-02';

export const getUpcomingTravel = async ({ limit = 5 } = {}) =>
  (BOOKING_FILES_SEED || [])
    .filter((b) => {
      const dep = b.travelDate || b.departure;
      return dep && dep >= WINDOW_FROM && dep <= WINDOW_TO;
    })
    .sort((a, b) =>
      (a.travelDate || a.departure || '').localeCompare(b.travelDate || b.departure || ''),
    )
    .slice(0, limit);
