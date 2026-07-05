import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { fyRange } from './utils/scorecard';
import { investmentRow } from './utils/investment';

// ─── TK GROUP CENTRAL · Investment / Capital (branchwise) ────────────────────
// Each branch's capital & investment in its OWN currency — capital invested,
// investments made, director/partner loans, capital employed and profit. Never
// consolidated into a group total. Reuses /api/accounting/capital-analysis.
const money = (cur, n) => `${cur || ''} ${Math.round(Number(n) || 0).toLocaleString()}`;
const cell = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left', whiteSpace: 'nowrap' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

export function InvestmentDashboard() {
  const { from, to } = fyRange(new Date());
  const q = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'invest', b.code, from, to], queryFn: () => apiGet('/api/accounting/capital-analysis', { branch: b.code, from, to }), staleTime: 60_000 })) });
  const rows = BRANCHES.map((b, i) => investmentRow(b, q[i] && q[i].data));

  return (
    <div>
      <p style={{ fontSize: 11.5, color: '#5a6691', margin: '0 0 10px' }}>
        FY {from} → {to} · <b>branchwise</b> — each branch in its own currency, never consolidated.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }} data-testid="tk-investment">
          <thead>
            <tr>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Branch</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Capital Invested</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Investments</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Loans</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Capital Employed</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td style={{ ...cell, fontWeight: 700 }}>{r.flag ? `${r.flag} ` : ''}{r.code}</td>
                <td style={num}>{money(r.cur, r.capitalInvested)}</td>
                <td style={num}>{money(r.cur, r.investments)}</td>
                <td style={num}>{money(r.cur, r.loans)}</td>
                <td style={num}>{money(r.cur, r.capitalEmployed)}</td>
                <td style={{ ...num, color: r.profit < 0 ? '#A32F2F' : '#1F6E4C' }}>{money(r.cur, r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: '#8892a4', marginTop: 8 }}>Branchwise — never consolidated. Investment requests are raised under Decisions and approved by Farhan + Owner.</p>
    </div>
  );
}
