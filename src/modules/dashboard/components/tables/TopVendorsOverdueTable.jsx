import React from 'react';
import { fmtINR } from '../../../../core/format';

export function TopVendorsOverdueTable({ suppliers, formatMoney = fmtINR }) {
  if (!suppliers || !suppliers.length) {
    return <p style={{ margin: 0, padding: '14px 4px', fontSize: 11, color: '#9197a3', textAlign: 'center' }}>No overdue payables.</p>;
  }
  // overdueDays / overdueAmount are sourced live from the AP ageing (getTopVendorsOverdue):
  // overdueDays is the lower bound of the oldest bucket carrying a balance.
  const daysLabel = (d) => (d >= 90 ? '90+ days overdue' : d > 0 ? `${d}+ days overdue` : 'within 30 days');
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
      <tbody>
        {suppliers.map((s, i) => (
          <tr key={s.name} style={{ borderBottom: '1px solid #f0f2f7' }}>
            <td style={{ padding: '7px 4px', color: '#5b616e', width: 20 }}>{i + 1}</td>
            <td style={{ padding: '7px 4px' }}>
              <p style={{ margin: 0, color: '#14161a', fontWeight: 600, fontSize: 11 }}>{s.name}</p>
              <p style={{ margin: 0, fontSize: 9.5, color: '#dc2626', fontWeight: 600 }}>
                {s.overdueDays != null ? daysLabel(s.overdueDays) : 'overdue n/a'}
              </p>
            </td>
            <td style={{ padding: '7px 4px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
              {s.overdueAmount != null ? formatMoney(s.overdueAmount) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
