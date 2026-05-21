import React from 'react';
import { card, btnGh } from '../../../../core/styles';

export function UpcomingTravelPanel({ bookings, onViewAll }) {
  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0d1326' }}>✈ Upcoming Travel (14 days)</p>
        <button onClick={onViewAll} style={{ ...btnGh, fontSize: 10, padding: '3px 10px' }}>
          All →
        </button>
      </div>
      {bookings.length === 0 && (
        <div style={{ padding: '14px', textAlign: 'center', color: '#5a6691', fontSize: 11 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>✈</div>
          No upcoming travel in next 14 days
        </div>
      )}
      {bookings.map((b, i) => (
        <div
          key={b.id || i}
          style={{ padding: '8px 0', borderBottom: i < bookings.length - 1 ? '1px solid #f3f4f8' : 'none' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#0d1326' }}>
                {b.client || b.clientName || 'Client'}
              </p>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: '#5a6691' }}>
                {b.destination || b.dest || 'Destination'} · {b.mod || 'Flight'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: '#185FA5' }}>
                {b.travelDate || b.departure || '—'}
              </p>
              <p style={{ margin: 0, fontSize: 9.5, color: '#5a6691' }}>{b.pax || 1} pax</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
