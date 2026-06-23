import React from 'react';

const HEADERS = ['Branch', 'TB', 'Recon', 'Approve', 'Status'];
const HEADER_BASE = {
  padding: '7px 8px',
  fontSize: 10,
  color: '#5b616e',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const statusColor = (s) => (s === 'Closed' ? '#16a34a' : s === 'Not Started' ? '#dc2626' : '#d97706');

export function PeriodCloseTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
      <thead>
        <tr style={{ background: '#f4f5f7' }}>
          {HEADERS.map((h, i) => (
            <th key={h} scope="col" style={{ ...HEADER_BASE, textAlign: i === 0 || i === 4 ? 'left' : 'center' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(rows || []).map((p) => (
          <tr key={p.branch} style={{ borderBottom: '1px solid #f0f2f7' }}>
            <td style={{ padding: '7px 8px', fontWeight: 700, color: '#14161a' }}>{p.branch}</td>
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
