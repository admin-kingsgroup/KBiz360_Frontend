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
              {/* NOTE: real overdue-days field not yet provided by the supplier feed (see getTopSuppliers). */}
              <p style={{ margin: 0, fontSize: 9.5, color: '#dc2626', fontWeight: 600 }}>
                {s.overdueDays != null ? `${s.overdueDays} days overdue` : 'overdue n/a'}
              </p>
            </td>
            <td style={{ padding: '7px 4px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
              {/* NOTE: real overdue-amount field not yet provided by the supplier feed (see getTopSuppliers). */}
              {s.overdueAmount != null ? fmtINR(s.overdueAmount) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
