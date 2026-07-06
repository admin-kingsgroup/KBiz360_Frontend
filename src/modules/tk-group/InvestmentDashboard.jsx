import React, { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { getLimits } from './api/limits';
import { fyRange } from './utils/scorecard';
import { investmentRow, fixFirstFlags } from './utils/investment';

// ─── TK GROUP CENTRAL · Investment / Capital (branchwise) ────────────────────
// Each branch's capital & investment in its OWN currency — capital invested,
// investments made, director/partner loans, capital employed and profit. Never
// consolidated into a group total. Reuses /api/accounting/capital-analysis.
const money = (cur, n) => `${cur || ''} ${Math.round(Number(n) || 0).toLocaleString()}`;
const cell = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left', whiteSpace: 'nowrap' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

function FixFirstCheck() {
  const lq = useQuery({ queryKey: ['tk', 'limits'], queryFn: getLimits, staleTime: 5 * 60_000 });
  const limits = (lq.data && lq.data.limits) || {};
  const [m, setM] = useState({ roi: '', overduePct: '', budgetOverPct: '' });
  const inp = { padding: '5px 8px', fontSize: 12, border: '1px solid #cdd1d8', borderRadius: 5, width: 80, textAlign: 'right' };
  const anyInput = m.roi !== '' || m.overduePct !== '' || m.budgetOverPct !== '';
  const flags = anyInput ? fixFirstFlags(m, limits) : [];
  return (
    <section style={{ background: '#fff', border: '1px solid #e3e6ec', borderRadius: 8, padding: '12px 14px' }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, color: '#1f2a44', margin: '0 0 4px' }}>Investment "fix-first" check</h2>
      <p style={{ fontSize: 11, color: '#8892a4', margin: '0 0 8px' }}>Enter a proposed investment's numbers — it flags "fix first" against the Owner-set thresholds (ROI ≥ {limits.investmentMinRoi ?? 1.5}×, overdue ≤ {limits.investmentMaxOverduePct ?? 15}%, budget-over ≤ {limits.investmentMaxBudgetOverPct ?? 10}%).</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
        <label>ROI (×) <input aria-label="ROI" type="number" step="any" value={m.roi} onChange={(e) => setM((s) => ({ ...s, roi: e.target.value }))} style={inp} /></label>
        <label>Overdue AR (%) <input aria-label="Overdue percent" type="number" step="any" value={m.overduePct} onChange={(e) => setM((s) => ({ ...s, overduePct: e.target.value }))} style={inp} /></label>
        <label>Budget over (%) <input aria-label="Budget over percent" type="number" step="any" value={m.budgetOverPct} onChange={(e) => setM((s) => ({ ...s, budgetOverPct: e.target.value }))} style={inp} /></label>
      </div>
      {anyInput ? (
        flags.length
          ? <div role="status" style={{ marginTop: 8, fontSize: 12, color: '#A32F2F', fontWeight: 600 }}>⚠ Fix first: {flags.join(' · ')}</div>
          : <div role="status" style={{ marginTop: 8, fontSize: 12, color: '#1F6E4C', fontWeight: 600 }}>✓ Clear to invest — no threshold breached.</div>
      ) : null}
    </section>
  );
}

export function InvestmentDashboard() {
  const { from, to } = fyRange(new Date());
  const q = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'invest', b.code, from, to], queryFn: () => apiGet('/api/accounting/capital-analysis', { branch: b.code, from, to }), staleTime: 60_000 })) });
  const rows = BRANCHES.map((b, i) => investmentRow(b, q[i] && q[i].data));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <FixFirstCheck />
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
