import React from 'react';

export function AnniversariesPanel({ anniversaries }) {
  return (
    <>
      {anniversaries.map((a) => (
        <div
          key={a.name}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #dfe2e7' }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#6B4C8B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#fff',
              fontSize: 14,
            }}
          >
            {a.years}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#14161a', fontWeight: 600 }}>{a.name}</p>
            <p style={{ margin: 0, fontSize: 10.5, color: '#5b616e' }}>
              {a.branch} · {a.years} year{a.years !== 1 ? 's' : ''} on {a.date}
            </p>
          </div>
          <button
            style={{
              padding: '4px 10px',
              background: '#6B4C8B',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Acknowledge
          </button>
        </div>
      ))}
    </>
  );
}
