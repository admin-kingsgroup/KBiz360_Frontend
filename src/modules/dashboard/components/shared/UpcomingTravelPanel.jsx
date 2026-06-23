import React from 'react';
import { Button } from '../../../../shell/primitives';

export function UpcomingTravelPanel({ bookings, onViewAll }) {
  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="m-0 text-xs font-bold text-ink">✈ Upcoming Travel (14 days)</h3>
        <Button variant="ghost" size="xs" onClick={onViewAll}>All →</Button>
      </div>
      {bookings.length === 0 && (
        <div className="px-3.5 py-3.5 text-center text-[11px] text-ink-muted">
          <div className="mb-1.5 text-[28px]">✈</div>
          No upcoming travel in next 14 days
        </div>
      )}
      {bookings.map((b, i) => (
        <div
          key={b.id || i}
          className="py-2"
          style={{ borderBottom: i < bookings.length - 1 ? '1px solid #f4f5f7' : 'none' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-ink">{b.client || b.clientName || 'Client'}</p>
              <p className="mt-px text-[10px] text-ink-muted">{b.destination || b.dest || 'Destination'} · {b.mod || 'Flight'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] font-bold text-info">{b.travelDate || b.departure || '—'}</p>
              <p className="text-[9.5px] text-ink-muted">{b.pax || 1} pax</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
