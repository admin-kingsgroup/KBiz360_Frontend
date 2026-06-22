// Upcoming Travel selection — pure transform behind the LIVE /api/booking-orders
// feed. Prefers bookings with a real travelDate in the window; falls back to recent
// bookings for legacy data with no travelDate. No seed arrays.
import { selectUpcomingTravel } from '../utils/transformers';

const B = (over = {}) => ({ id: 'b', customer: { name: 'C' }, headerRef: 'BOM-DXB', module: 'SF', rows: [{}, {}], date: '2026-06-01', ...over });

describe('selectUpcomingTravel', () => {
  test('picks bookings with travelDate in the next 14 days, soonest first', () => {
    const out = selectUpcomingTravel([
      B({ id: 'far', travelDate: '2026-07-30' }),     // outside window
      B({ id: 'd2', travelDate: '2026-06-26' }),
      B({ id: 'd1', travelDate: '2026-06-24' }),
    ], '2026-06-22', 14, 5);
    expect(out.map((r) => r.id)).toEqual(['d1', 'd2']);  // soonest first, far excluded
    expect(out[0]).toMatchObject({ client: 'C', destination: 'BOM-DXB', mod: 'SF', travelDate: '2026-06-24', pax: 2 });
  });

  test('no travelDate anywhere → falls back to most recent bookings by booking date', () => {
    const out = selectUpcomingTravel([
      B({ id: 'old', date: '2026-05-01' }),
      B({ id: 'new', date: '2026-06-20' }),
    ], '2026-06-22', 14, 5);
    expect(out.map((r) => r.id)).toEqual(['new', 'old']);  // recent first
    expect(out[0].travelDate).toBe('2026-06-20');           // falls back to booking date
  });

  test('respects the limit and handles empty input', () => {
    expect(selectUpcomingTravel([], '2026-06-22')).toEqual([]);
    const many = Array.from({ length: 9 }, (_, i) => B({ id: `b${i}`, travelDate: `2026-06-2${i % 5 + 3}` }));
    expect(selectUpcomingTravel(many, '2026-06-22', 14, 5)).toHaveLength(5);
  });
});
