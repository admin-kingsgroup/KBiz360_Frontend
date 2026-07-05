import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { scorecardRow, fyRange } from './utils/scorecard';

// ─── TK GROUP CENTRAL · Branch Scorecard ─────────────────────────────────────
// A branchwise performance view — every branch side by side in its OWN currency.
// Amounts are NOT consolidated or blended into a group total; this is oversight of
// each branch on its own terms. Reuses the existing accounting endpoints.
const money = (cur, n) => `${cur || ''} ${Math.round(Number(n) || 0).toLocaleString()}`;
const cell = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left', whiteSpace: 'nowrap' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

export function BranchScorecard() {
  const { from, to } = fyRange(new Date());
  const pnl = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'sc', 'pnl', b.code, from, to], queryFn: () => apiGet('/api/accounting/profit-and-loss', { branch: b.code, from, to }), staleTime: 60_000 })) });
  const inv = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'sc', 'inv', b.code, from, to], queryFn: () => apiGet('/api/accounting/invoice-gp', { branch: b.code, from, to }), staleTime: 60_000 })) });
  const loading = pnl.some((q) => q.isLoading) || inv.some((q) => q.isLoading);
  const rows = BRANCHES.map((b, i) => scorecardRow(b, pnl[i] && pnl[i].data, inv[i] && inv[i].data));

  return (
    <div>
      <p style={{ fontSize: 11.5, color: '#5a6691', margin: '0 0 10px' }}>
        FY {from} → {to} · <b>branchwise</b> — each branch in its own currency, never consolidated.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }} data-testid="tk-scorecard">
          <thead>
            <tr>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Branch</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Sales</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Gross Profit</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>GP %</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Net Profit</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Bookings</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td style={{ ...cell, fontWeight: 700 }}>{r.flag ? `${r.flag} ` : ''}{r.code}{r.city ? <span style={{ color: '#8892a4', fontWeight: 400 }}> · {r.city}</span> : null}</td>
                <td style={num}>{money(r.cur, r.sales)}</td>
                <td style={num}>{money(r.cur, r.gp)}</td>
                <td style={{ ...num, color: r.gpPct >= 15 ? '#1F6E4C' : (r.gpPct < 10 ? '#A32F2F' : '#6E5518') }}>{r.gpPct}%</td>
                <td style={{ ...num, color: r.np < 0 ? '#A32F2F' : '#1f2a44' }}>{money(r.cur, r.np)}</td>
                <td style={num}>{r.bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading ? <p style={{ fontSize: 11, color: '#8892a4', marginTop: 8 }}>Loading branch figures…</p> : null}
      <p style={{ fontSize: 11, color: '#8892a4', marginTop: 8 }}>No group total by design — branches are equal peers, compared side by side, not summed.</p>
    </div>
  );
}
