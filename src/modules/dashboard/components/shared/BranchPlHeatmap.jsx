import React from 'react';

export function BranchPlHeatmap({ rows }) {
  if (!rows.length) return null;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 10, width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 6px', textAlign: 'left', color: '#5b616e' }} />
            {rows[0].cells.map((c) => (
              <th key={c.month} style={{ padding: '4px 3px', fontSize: 9, color: '#5b616e', fontWeight: 600 }}>
                {c.month.substring(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.branch}>
              <td style={{ padding: '4px 6px', fontWeight: 700, color: '#14161a', fontSize: 10.5 }}>{row.branch}</td>
              {row.cells.map((c) => {
                const pct = c.rev > 0 ? c.gp / c.rev : 0;
                const intensity = Math.min(0.85, pct * 5);
                return (
                  <td key={c.month} style={{ padding: 0, textAlign: 'center' }}>
                    <div
                      title={`${row.branch} ${c.month}: GP ${(pct * 100).toFixed(1)}%`}
                      style={{
                        height: 24,
                        background: c.rev > 0 ? `rgba(212,164,55,${intensity})` : '#f0f2f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 700,
                        color: intensity > 0.4 ? '#14161a' : '#5b616e',
                        margin: 1,
                        borderRadius: 2,
                      }}
                    >
                      {c.rev > 0 ? (pct * 100).toFixed(0) + '%' : '—'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
