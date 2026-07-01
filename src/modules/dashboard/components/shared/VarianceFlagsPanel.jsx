import React from 'react';

// `formatMoney` is the branch-aware money formatter (compactAmt) — use it for the overrun
// amount instead of the old raw "÷1000 + K", which ignored the branch currency and the
// house Cr/L compaction. Flags are pre-filtered to actual>budget, so every row is a genuine
// over-budget overrun (red + "over budget" is correct). `currency` kept as legacy fallback.
export function VarianceFlagsPanel({ flags, formatMoney, currency = '₹' }) {
  const fmt = formatMoney || ((n) => `${currency}${(Number(n) / 1000).toFixed(0)}K`);
  return (
    <>
      {flags.map((v, i) => (
        <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid #dfe2e7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#14161a', fontWeight: 600 }}>{v.account}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#dc2626', fontWeight: 700 }}>{`${v.pct >= 0 ? '+' : ''}${v.pct}%`}</p>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#5b616e' }}>
            {v.branch} · {v.date} · {fmt(v.variance)} over budget
          </p>
        </div>
      ))}
    </>
  );
}
