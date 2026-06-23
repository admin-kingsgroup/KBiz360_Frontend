import React from 'react';

export function VarianceFlagsPanel({ flags }) {
  return (
    <>
      {flags.map((v, i) => (
        <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid #f0f2f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#14161a', fontWeight: 600 }}>{v.account}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#dc2626', fontWeight: 700 }}>+{v.pct}%</p>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#5b616e' }}>
            {v.branch} · {v.date} · ₹{(v.variance / 1000).toFixed(0)}K over budget
          </p>
        </div>
      ))}
    </>
  );
}
