import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranchCockpit } from './api/monitor';

// ─── TK GROUP · FE · Branch Cockpit (container) ──────────────────────────────
// Per-branch control posture: pending decisions / governance items and locked
// periods, so you can see at a glance which branch needs attention. Read-only.
const cell = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

export function BranchCockpit() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'branches'], queryFn: getBranchCockpit, staleTime: 30_000, refetchInterval: 60_000 });
  const rows = (q.data && q.data.items) || [];

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="tk-cockpit">
      <thead>
        <tr>
          <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Branch</th>
          <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Pending decisions</th>
          <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Pending governance</th>
          <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Locked periods</th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((r) => {
          const attention = (r.pendingDecisions || 0) + (r.pendingGovernance || 0);
          return (
            <tr key={r.branch} style={attention ? { background: '#FBF6E9' } : undefined}>
              <td style={{ ...cell, fontWeight: 700 }}>{r.branch}</td>
              <td style={num}>{r.pendingDecisions || 0}</td>
              <td style={num}>{r.pendingGovernance || 0}</td>
              <td style={cell}>{(r.lockedPeriods || []).length ? r.lockedPeriods.join(', ') : '—'}</td>
            </tr>
          );
        }) : <tr><td style={{ ...cell, color: '#777' }} colSpan={4}>No branch data.</td></tr>}
      </tbody>
    </table>
  );
}
