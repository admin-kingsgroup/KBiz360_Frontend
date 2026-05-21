import React from 'react';

export function BirthdaysPanel({ birthdays }) {
  if (birthdays.length === 0) {
    return <p style={{ margin: 0, color: '#5a6691', fontSize: 11.5 }}>No birthdays this week</p>;
  }
  return (
    <>
      {birthdays.map((b) => (
        <div
          key={b.name}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0f2f7' }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#d4a437',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#0d1326',
              fontSize: 14,
            }}
          >
            {b.name.substring(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#0d1326', fontWeight: 600 }}>{b.name}</p>
            <p style={{ margin: 0, fontSize: 10.5, color: '#5a6691' }}>
              {b.branch} · {b.date}
            </p>
          </div>
          <button
            style={{
              padding: '4px 10px',
              background: '#d4a437',
              color: '#0d1326',
              border: 'none',
              borderRadius: 4,
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Send wish
          </button>
        </div>
      ))}
    </>
  );
}
