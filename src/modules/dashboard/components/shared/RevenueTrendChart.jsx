import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtINR } from '../../../../core/format';

export function RevenueTrendChart({ data, compareLastYear, onToggleCompare }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: '#5a6691', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={compareLastYear}
            onChange={(e) => onToggleCompare(e.target.checked)}
            style={{ marginRight: 5 }}
          />
          Compare to last year
        </label>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#5a6691' }} />
          <YAxis tick={{ fontSize: 10, fill: '#5a6691' }} tickFormatter={(v) => (v / 1000000).toFixed(0) + 'M'} />
          <Tooltip formatter={(v) => fmtINR(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="cy" stroke="#0d1326" strokeWidth={2.5} name="Current Year" dot={{ r: 3 }} />
          {compareLastYear && (
            <Line type="monotone" dataKey="ly" stroke="#d4a437" strokeWidth={2} name="Last Year" strokeDasharray="5 5" dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
