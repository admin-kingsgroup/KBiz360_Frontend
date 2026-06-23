import React from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtINR } from '../../../../core/format';

export function CashForecastChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
        <XAxis dataKey="week" tick={{ fontSize: 9.5, fill: '#5b616e' }} />
        <YAxis tick={{ fontSize: 10, fill: '#5b616e' }} tickFormatter={(v) => (v / 100000).toFixed(0) + 'L'} />
        <Tooltip formatter={(v) => fmtINR(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="inflow" stroke="#16a34a" fill="#16a34a" fillOpacity={0.25} name="Inflow" />
        <Area type="monotone" dataKey="outflow" stroke="#dc2626" fill="#dc2626" fillOpacity={0.25} name="Outflow" />
        <Area type="monotone" dataKey="closing" stroke="#14161a" fill="#c2a04a" fillOpacity={0.2} name="Closing Balance" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
