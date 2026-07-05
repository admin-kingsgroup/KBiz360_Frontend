import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { scorecardRow, fyRange } from './utils/scorecard';
import { branchExceptions, riskScore } from './utils/exceptions';

// ─── TK GROUP CENTRAL · Exceptions & Risk ────────────────────────────────────
// Branchwise governance red-flags — each branch assessed on its own figures (net
// loss, thin margin, no bookings). Not consolidated; the worst-off branches surface
// first so the Owner sees what needs attention.
const money = (cur, n) => `${cur || ''} ${Math.round(Number(n) || 0).toLocaleString()}`;
const cell = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left', verticalAlign: 'top' };
const pill = (sev) => ({ display: 'inline-block', margin: '0 4px 4px 0', fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: sev === 'high' ? '#F6E4E4' : '#FBF6E9', color: sev === 'high' ? '#A32F2F' : '#6E5518' });

export function ExceptionsRisk() {
  const { from, to } = fyRange(new Date());
  const pnl = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'ex', 'pnl', b.code, from, to], queryFn: () => apiGet('/api/accounting/profit-and-loss', { branch: b.code, from, to }), staleTime: 60_000 })) });
  const inv = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'ex', 'inv', b.code, from, to], queryFn: () => apiGet('/api/accounting/invoice-gp', { branch: b.code, from, to }), staleTime: 60_000 })) });

  const rows = BRANCHES.map((b, i) => {
    const sc = scorecardRow(b, pnl[i] && pnl[i].data, inv[i] && inv[i].data);
    const flags = branchExceptions(sc);
    return { ...sc, flags, score: riskScore(flags) };
  }).sort((a, b) => b.score - a.score);
  const clean = rows.every((r) => !r.flags.length);

  return (
    <div>
      <p style={{ fontSize: 11.5, color: '#5a6691', margin: '0 0 10px' }}>
        FY {from} → {to} · <b>branchwise</b> — each branch judged on its own figures, worst first.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }} data-testid="tk-exceptions">
          <thead>
            <tr>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Branch</th>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700, textAlign: 'right' }}>Net Profit</th>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700, textAlign: 'right' }}>GP %</th>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} style={r.flags.length ? { background: '#FDFBF4' } : undefined}>
                <td style={{ ...cell, fontWeight: 700 }}>{r.flag ? `${r.flag} ` : ''}{r.code}</td>
                <td style={{ ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.np < 0 ? '#A32F2F' : '#1f2a44' }}>{money(r.cur, r.np)}</td>
                <td style={{ ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.gpPct}%</td>
                <td style={cell}>
                  {r.flags.length ? r.flags.map((f, i) => <span key={i} style={pill(f.sev)}>{f.label}</span>) : <span style={{ color: '#1F6E4C', fontSize: 11.5 }}>✓ clear</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {clean ? <p style={{ fontSize: 11.5, color: '#1F6E4C', marginTop: 8 }}>No exceptions across the branches.</p> : null}
      <p style={{ fontSize: 11, color: '#8892a4', marginTop: 8 }}>Branchwise — never consolidated. Thresholds: net loss (high), GP% under 10% or no bookings (watch).</p>
    </div>
  );
}
