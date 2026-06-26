import React from 'react';
import { fmtINR } from '../../../../core/format';

export function RecentActivityFeed({ entries, formatMoney = fmtINR }) {
  return (
    <>
      {entries.map((a, i) => (
        <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #dfe2e7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 11.5, color: '#14161a', fontWeight: 600 }}>{a.action}</p>
            {a.amount > 0 && (
              <p style={{ margin: 0, fontSize: 11.5, color: '#c2a04a', fontWeight: 700 }}>{formatMoney(a.amount)}</p>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#5b616e' }}>
            {a.vendor} · {a.ts}
          </p>
        </div>
      ))}
    </>
  );
}
