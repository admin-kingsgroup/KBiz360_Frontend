import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtINR } from '../../../../core/format';
import { useMobile } from '../../../../core/hooks';

export function RevenueTrendChart({ data, compareLastYear, onToggleCompare, formatMoney = fmtINR }) {
  const mob = useMobile();
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: '#5b616e', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 4px' }}>
          <input
            type="checkbox"
            checked={compareLastYear}
            onChange={(e) => onToggleCompare(e.target.checked)}
            style={{ marginRight: 6, width: 16, height: 16 }}
          />
          Compare to last year
        </label>
      </div>
      <ResponsiveContainer width="100%" height={mob ? 190 : 240}>
        <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#5b616e' }} />
          <YAxis tick={{ fontSize: 10, fill: '#5b616e' }} tickFormatter={(v) => (v / 1000000).toFixed(0) + 'M'} />
          <Tooltip formatter={(v) => formatMoney(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="cy" stroke="#14161a" strokeWidth={2.5} name="Current Year" dot={{ r: 3 }} />
          {compareLastYear && (
            <Line type="monotone" dataKey="ly" stroke="#c2a04a" strokeWidth={2} name="Last Year" strokeDasharray="5 5" dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
