import React from 'react';
import { fmtINR } from '../../../../core/format';

export function TopVendorsOverdueTable({ suppliers }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
      <tbody>
        {suppliers.map((s, i) => (
          <tr key={s.name} style={{ borderBottom: '1px solid #f0f2f7' }}>
            <td style={{ padding: '7px 4px', color: '#5b616e', width: 20 }}>{i + 1}</td>
            <td style={{ padding: '7px 4px' }}>
              <p style={{ margin: 0, color: '#14161a', fontWeight: 600, fontSize: 11 }}>{s.name}</p>
              <p style={{ margin: 0, fontSize: 9.5, color: '#dc2626', fontWeight: 600 }}>{45 + i * 8} days overdue</p>
            </td>
            <td style={{ padding: '7px 4px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
              {fmtINR(s.spend * 0.04)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
