import React, { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { fyRange } from './utils/scorecard';
import { perfTargetRow, PERF_METRICS, fyStr } from './utils/perfTarget';

// ─── TK GROUP CENTRAL · Performance vs Target (branchwise) ────────────────────
// Each branch's target vs actual for the chosen metric, in its OWN currency — never
// consolidated. Reuses /api/accounting/targets-vs-actual per branch.
const money = (cur, n) => `${cur || ''} ${Math.round(Number(n) || 0).toLocaleString()}`;
const cell = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left', whiteSpace: 'nowrap' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const inp = { padding: '5px 8px', fontSize: 12, border: '1px solid #cdd1d8', borderRadius: 5 };
const achColor = (a) => (a >= 100 ? '#1F6E4C' : a >= 90 ? '#6E5518' : '#A32F2F');

export function PerformanceTargets() {
  const [metric, setMetric] = useState('sales');
  const { from, to } = fyRange(new Date());
  const fy = fyStr(new Date());
  const q = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'pvt', metric, b.code, fy], queryFn: () => apiGet('/api/accounting/targets-vs-actual', { branch: b.code, metric, from, to, fy }), staleTime: 60_000 })) });
  const rows = BRANCHES.map((b, i) => perfTargetRow(b, q[i] && q[i].data));
  const noTargets = rows.every((r) => r.target === 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#5a6691' }}>Metric</label>
        <select aria-label="Metric" value={metric} onChange={(e) => setMetric(e.target.value)} style={inp}>
          {PERF_METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <span style={{ fontSize: 11.5, color: '#8892a4' }}>FY {fy} · <b>branchwise</b></span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }} data-testid="tk-perf-target">
          <thead>
            <tr>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Branch</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Target</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Actual</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Achievement</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td style={{ ...cell, fontWeight: 700 }}>{r.flag ? `${r.flag} ` : ''}{r.code}</td>
                <td style={num}>{money(r.cur, r.target)}</td>
                <td style={num}>{money(r.cur, r.actual)}</td>
                <td style={{ ...num, fontWeight: 700, color: achColor(r.achievement) }}>{r.target ? `${r.achievement}%` : '—'}</td>
                <td style={{ ...num, color: r.variance < 0 ? '#A32F2F' : '#1F6E4C' }}>{money(r.cur, r.variance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {noTargets ? <p style={{ fontSize: 11.5, color: '#6E5518', marginTop: 8 }}>No targets set for this metric — set them in TK Group Central ▸ Controls ▸ Targets &amp; Budgets.</p> : null}
      <p style={{ fontSize: 11, color: '#8892a4', marginTop: 8 }}>Branchwise — each branch vs its own target, never consolidated.</p>
    </div>
  );
}
