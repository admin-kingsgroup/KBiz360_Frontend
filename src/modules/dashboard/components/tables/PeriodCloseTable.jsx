import React from 'react';

const HEADERS = ['Branch', 'TB', 'Recon', 'Approve', 'Status'];
const HEADER_BASE = {
  padding: '7px 8px',
  fontSize: 10,
  color: '#5a6691',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const statusColor = (s) => (s === 'Closed' ? '#22c55e' : s === 'Not Started' ? '#A32D2D' : '#f97316');

export function PeriodCloseTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
      <thead>
        <tr style={{ background: '#f7f8fb' }}>
          {HEADERS.map((h, i) => (
            <th key={h} style={{ ...HEADER_BASE, textAlign: i === 0 || i === 4 ? 'left' : 'center' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.branch} style={{ borderBottom: '1px solid #f0f2f7' }}>
            <td style={{ padding: '7px 8px', fontWeight: 700, color: '#0d1326' }}>{p.branch}</td>
            <td style={{ padding: '7px 8px', textAlign: 'center' }}>{p.tbClosed ? '✓' : '○'}</td>
            <td style={{ padding: '7px 8px', textAlign: 'center' }}>{p.reconciled ? '✓' : '○'}</td>
            <td style={{ padding: '7px 8px', textAlign: 'center' }}>{p.approved ? '✓' : '○'}</td>
            <td style={{ padding: '7px 8px', fontSize: 10.5, color: statusColor(p.status), fontWeight: 600 }}>
              {p.status}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
