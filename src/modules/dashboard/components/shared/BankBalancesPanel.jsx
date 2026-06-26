import React from 'react';

export function BankBalancesPanel({ accounts, limit = 7 }) {
  return (
    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
      {accounts.slice(0, limit).map((b) => (
        <div
          key={b.id}
          style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #dfe2e7' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: '#14161a',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {b.bank}
            </p>
            <p style={{ margin: 0, fontSize: 9.5, color: '#5b616e' }}>
              {b.branch} · ...{(b.accountNo || '').slice(-6)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#14161a', fontFamily: 'monospace' }}>
              {b.currency} {(b.openingBal / 1000).toFixed(0)}K
            </p>
            <p style={{ margin: 0, fontSize: 9, color: b.limit > 0 && b.openingBal / b.limit > 0.8 ? '#dc2626' : '#5b616e' }}>
              {b.limit > 0 ? Math.round((b.openingBal / b.limit) * 100) : 0}% of limit
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
