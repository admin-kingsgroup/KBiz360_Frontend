import React from 'react';
import { fmtINR } from '../../../../core/format';

const HEADER_BASE = { padding: '7px 8px', fontSize: 10, color: '#5b616e', fontWeight: 700 };

export function TodayVouchersTable({ data }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
      <thead>
        <tr style={{ background: '#f4f5f7' }}>
          <th style={{ ...HEADER_BASE, textAlign: 'left' }}>Branch</th>
          <th style={{ ...HEADER_BASE, padding: '7px 6px', textAlign: 'center' }}>Receipt</th>
          <th style={{ ...HEADER_BASE, padding: '7px 6px', textAlign: 'center' }}>Payment</th>
          <th style={{ ...HEADER_BASE, padding: '7px 6px', textAlign: 'center' }}>Journal</th>
          <th style={{ ...HEADER_BASE, textAlign: 'right' }}>Total Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(data).map(([br, v]) => (
          <tr key={br} style={{ borderBottom: '1px solid #f0f2f7' }}>
            <td style={{ padding: '7px 8px', fontWeight: 700, color: '#14161a' }}>{br}</td>
            <td style={{ padding: '7px 6px', textAlign: 'center' }}>{v.receipt}</td>
            <td style={{ padding: '7px 6px', textAlign: 'center' }}>{v.payment}</td>
            <td style={{ padding: '7px 6px', textAlign: 'center' }}>{v.journal}</td>
            <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
              {fmtINR(v.value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
