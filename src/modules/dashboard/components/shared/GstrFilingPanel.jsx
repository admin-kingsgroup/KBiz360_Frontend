import React from 'react';

export function GstrFilingPanel({ rows }) {
  if (!rows || rows.length === 0) {
    return <p style={{ margin: 0, padding: '8px 0', fontSize: 10.5, color: '#5a6691' }}>No GST filing data available.</p>;
  }
  return (
    <>
      {rows.map((g) => (
        <div key={g.entity} style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f7' }}>
          <p style={{ margin: 0, fontSize: 11.5, color: '#14161a', fontWeight: 600 }}>{g.entity}</p>
          <p style={{ margin: '2px 0 4px', fontSize: 9.5, color: '#5b616e', fontFamily: 'monospace' }}>{g.gstin}</p>
          <div style={{ display: 'flex', gap: 14, fontSize: 10.5 }}>
            <span style={{ color: g.gstr1 === 'Filed' ? '#16a34a' : '#dc2626' }}>
              GSTR-1: <b>{g.gstr1}</b>
            </span>
            <span style={{ color: g.gstr3b === 'Filed' ? '#16a34a' : '#dc2626' }}>
              GSTR-3B: <b>{g.gstr3b}</b>
            </span>
            <span style={{ color: '#5b616e' }}>Due: {g.due}</span>
          </div>
        </div>
      ))}
    </>
  );
}
