import React from 'react';

const statusColor = (s) => (s === 'Clean' || s === 'Good' ? '#22c55e' : s === 'Behind' ? '#A32D2D' : '#f97316');

export function BankReconStatusPanel({ rows }) {
  return (
    <>
      {rows.map((r) => {
        const total = r.matched + r.unmatched;
        const ratio = total > 0 ? r.matched / total : 0;
        return (
          <div key={r.bank} style={{ padding: '6px 0', borderBottom: '1px solid #f0f2f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#0d1326', fontWeight: 600 }}>{r.bank}</span>
              <span style={{ fontSize: 10, color: statusColor(r.status), fontWeight: 700 }}>{r.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, fontSize: 9.5, color: '#5a6691' }}>
              <span>{r.matched} matched</span>
              <span style={{ color: r.unmatched > 0 ? '#A32D2D' : '#5a6691' }}>{r.unmatched} unmatched</span>
              <span style={{ marginLeft: 'auto' }}>{(ratio * 100).toFixed(1)}% reconciled</span>
            </div>
          </div>
        );
      })}
    </>
  );
}
