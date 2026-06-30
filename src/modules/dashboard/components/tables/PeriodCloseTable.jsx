import React from 'react';

// Honest columns only. The source knows ONE real signal: whether the branch still has
// unposted (pending) vouchers this month (zero pending ⇒ all entries posted ⇒ period
// effectively closed). The old TB / Recon / Approve trio were three columns ALL driven by
// that single boolean — implying three independent checks that don't exist. Collapsed to a
// single "Entries Posted" indicator + the derived Status. (Add real columns here only when a
// genuine month-end-lock / reconciliation-sign-off subsystem provides distinct signals.)
const HEADERS = ['Branch', 'Entries Posted', 'Status'];
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
            <th key={h} scope="col" style={{ ...HEADER_BASE, textAlign: i === 1 ? 'center' : 'left' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(rows || []).map((p) => {
          const posted = p.tbClosed ?? (p.status === 'Closed');
          return (
            <tr key={p.branch} style={{ borderBottom: '1px solid #dfe2e7' }}>
              <td style={{ padding: '7px 8px', fontWeight: 700, color: '#14161a' }}>{p.branch}</td>
              <td style={{ padding: '7px 8px', textAlign: 'center', color: posted ? '#16a34a' : '#d97706' }} title={posted ? 'All vouchers posted' : 'Pending vouchers remain'}>{posted ? '✓ All posted' : '○ Pending'}</td>
              <td style={{ padding: '7px 8px', fontSize: 10.5, color: statusColor(p.status), fontWeight: 600 }}>
                {p.status}
              </td>
            </tr>
          );
        })}
        {(!rows || rows.length === 0) && <tr><td colSpan={3} style={{ padding: '10px 8px', fontSize: 10.5, color: '#5b616e' }}>No branch data.</td></tr>}
      </tbody>
    </table>
  );
}
