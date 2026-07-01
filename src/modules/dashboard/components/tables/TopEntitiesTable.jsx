import React from 'react';
import { fmtINR } from '../../../../core/format';

/**
 * Reusable top-N table for ranked entities (customers, suppliers, vendors).
 * Configurable via `kind` to flip column labels and share %  colors.
 */
export function TopEntitiesTable({
  rows,
  kind = 'customer', // 'customer' | 'supplier'
  valueKey = 'revenue',
  countKey = 'bookings',
  countLabel,
  shareColor,
  formatMoney = fmtINR,
}) {
  const isCustomer = kind === 'customer';
  const defaultCountLabel = isCustomer ? 'bookings' : 'vouchers';
  const defaultShareColor = isCustomer ? '#c2a04a' : '#dc2626';
  if (!rows || rows.length === 0) {
    return (
      <p style={{ margin: 0, padding: '14px 4px', fontSize: 11, color: '#9197a3', textAlign: 'center' }}>
        No {isCustomer ? 'customers' : 'suppliers'} for this period.
      </p>
    );
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.name} style={{ borderBottom: '1px solid #dfe2e7' }}>
            <td style={{ padding: '6px 4px', color: '#5b616e', width: 24 }}>{i + 1}.</td>
            <td style={{ padding: '6px 4px' }}>
              <p style={{ margin: 0, color: '#14161a', fontWeight: 600 }}>{row.name}</p>
              <p style={{ margin: 0, fontSize: 9.5, color: '#5b616e' }}>
                {row[countKey]} {countLabel || defaultCountLabel} · {row.branch}
              </p>
            </td>
            <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#14161a' }}>
              {formatMoney(row[valueKey])}
            </td>
            <td
              style={{
                padding: '6px 4px',
                textAlign: 'right',
                color: shareColor || defaultShareColor,
                fontWeight: 600,
                fontSize: 10,
              }}
            >
              {row.share}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
