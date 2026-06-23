import React from 'react';

const statusColor = (s) => (s === 'Clean' || s === 'Good' ? '#16a34a' : s === 'Behind' ? '#dc2626' : '#d97706');

export function BankReconStatusPanel({ rows }) {
  return (
    <>
      {rows.map((r) => {
        const ratio = r.matched / (r.matched + r.unmatched);
        return (
          <div key={r.bank} style={{ padding: '6px 0', borderBottom: '1px solid #f0f2f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#14161a', fontWeight: 600 }}>{r.bank}</span>
              <span style={{ fontSize: 10, color: statusColor(r.status), fontWeight: 700 }}>{r.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, fontSize: 9.5, color: '#5b616e' }}>
              <span>{r.matched} matched</span>
              <span style={{ color: r.unmatched > 0 ? '#dc2626' : '#5b616e' }}>{r.unmatched} unmatched</span>
              <span style={{ marginLeft: 'auto' }}>{(ratio * 100).toFixed(1)}% reconciled</span>
            </div>
          </div>
        );
      })}
    </>
  );
}
