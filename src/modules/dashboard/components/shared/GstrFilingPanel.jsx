import React from 'react';

export function GstrFilingPanel({ rows }) {
  return (
    <>
      {rows.map((g) => (
        <div key={g.entity} style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f7' }}>
          <p style={{ margin: 0, fontSize: 11.5, color: '#0d1326', fontWeight: 600 }}>{g.entity}</p>
          <p style={{ margin: '2px 0 4px', fontSize: 9.5, color: '#5a6691', fontFamily: 'monospace' }}>{g.gstin}</p>
          <div style={{ display: 'flex', gap: 14, fontSize: 10.5 }}>
            <span style={{ color: g.gstr1 === 'Filed' ? '#22c55e' : '#A32D2D' }}>
              GSTR-1: <b>{g.gstr1}</b>
            </span>
            <span style={{ color: g.gstr3b === 'Filed' ? '#22c55e' : '#A32D2D' }}>
              GSTR-3B: <b>{g.gstr3b}</b>
            </span>
            <span style={{ color: '#5a6691' }}>Due: {g.due}</span>
          </div>
        </div>
      ))}
    </>
  );
}
