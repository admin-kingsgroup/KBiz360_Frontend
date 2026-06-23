import React from 'react';
import { fmtINR } from '../../../../core/format';

export function GstrFilingPanel({ rows, formatMoney = fmtINR }) {
  if (!rows || rows.length === 0) {
    return <p style={{ margin: 0, padding: '8px 0', fontSize: 10.5, color: '#5a6691' }}>No GST return due.</p>;
  }
  return (
    <>
      {rows.map((g) => (
        <div key={g.entity} style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11.5, color: '#14161a', fontWeight: 600 }}>{g.entity}</p>
            {g.net != null && <span style={{ fontSize: 11, fontWeight: 700, color: g.net > 0 ? '#dc2626' : '#16a34a' }}>{formatMoney(g.net)}</span>}
          </div>
          <p style={{ margin: '2px 0 4px', fontSize: 9.5, color: '#5b616e', fontFamily: 'monospace' }}>{g.gstin || '—'}</p>
          <div style={{ display: 'flex', gap: 14, fontSize: 10.5 }}>
            <span style={{ color: g.gstr1 === 'Filed' ? '#16a34a' : '#dc2626' }}>
              <span aria-hidden="true">{g.gstr1 === 'Filed' ? '✓ ' : '✗ '}</span>GSTR-1: <b>{g.gstr1}</b>
            </span>
            <span style={{ color: g.gstr3b === 'Filed' ? '#16a34a' : '#dc2626' }}>
              <span aria-hidden="true">{g.gstr3b === 'Filed' ? '✓ ' : '✗ '}</span>GSTR-3B: <b>{g.gstr3b}</b>
            </span>
            <span style={{ color: '#5b616e' }}>Due: {g.due}</span>
          </div>
        </div>
      ))}
    </>
  );
}
