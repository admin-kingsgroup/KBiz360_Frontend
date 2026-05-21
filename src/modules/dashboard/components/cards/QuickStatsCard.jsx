import React from 'react';
import { card } from '../../../../core/styles';

export function QuickStatsCard({ title = '📈 Quick Stats — YTD', rows }) {
  return (
    <div style={{ ...card, background: '#0d1326' }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#d4a437' }}>{title}</p>
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '5px 0',
            borderBottom: i < rows.length - 1 ? '1px solid #1a2340' : 'none',
          }}
        >
          <span style={{ fontSize: 10.5, color: '#8b94b3' }}>{row.label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: row.color, fontVariantNumeric: 'tabular-nums' }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
