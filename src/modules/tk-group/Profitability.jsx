import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { fyRange } from './utils/scorecard';
import { profitabilityRow } from './utils/profitability';

// ─── TK GROUP CENTRAL · Profitability (branchwise) ───────────────────────────
// Each branch's P&L — Revenue, Cost, Gross Profit, GP%, Expenses, Net Profit, NP% —
// in its OWN currency. Never consolidated into a group total.
const money = (cur, n) => `${cur || ''} ${Math.round(Number(n) || 0).toLocaleString()}`;
const cell = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left', whiteSpace: 'nowrap' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

export function Profitability() {
  const { from, to } = fyRange(new Date());
  const q = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'pl', b.code, from, to], queryFn: () => apiGet('/api/accounting/profit-and-loss', { branch: b.code, from, to }), staleTime: 60_000 })) });
  const rows = BRANCHES.map((b, i) => profitabilityRow(b, q[i] && q[i].data));

  return (
    <div>
      <p style={{ fontSize: 11.5, color: '#5a6691', margin: '0 0 10px' }}>FY {from} → {to} · <b>branchwise</b> — each branch in its own currency, never consolidated.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }} data-testid="tk-profitability">
          <thead>
            <tr>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Branch</th>
              {['Revenue', 'Cost', 'Gross Profit', 'GP %', 'Expenses', 'Net Profit', 'NP %'].map((h) => (
                <th key={h} style={{ ...num, color: '#5a6691', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td style={{ ...cell, fontWeight: 700 }}>{r.flag ? `${r.flag} ` : ''}{r.code}</td>
                <td style={num}>{money(r.cur, r.rev)}</td>
                <td style={num}>{money(r.cur, r.cost)}</td>
                <td style={num}>{money(r.cur, r.gp)}</td>
                <td style={{ ...num, color: r.gpPct >= 15 ? '#1F6E4C' : (r.gpPct < 10 ? '#A32F2F' : '#6E5518') }}>{r.gpPct}%</td>
                <td style={num}>{money(r.cur, r.exp)}</td>
                <td style={{ ...num, fontWeight: 700, color: r.np < 0 ? '#A32F2F' : '#1f2a44' }}>{money(r.cur, r.np)}</td>
                <td style={{ ...num, color: r.npPct < 0 ? '#A32F2F' : '#1F6E4C' }}>{r.npPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: '#8892a4', marginTop: 8 }}>Branchwise — never consolidated. Branches are equal peers, compared side by side.</p>
    </div>
  );
}
