import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranchCockpit } from './api/monitor';

// ─── TK GROUP CENTRAL · Compliance & Close ───────────────────────────────────
// Per-branch close & compliance posture — is the branch locked, does it have pending
// governance/decisions to clear. Branchwise; every branch stands on its own. Reuses
// the monitor endpoint (period locks + pending change-requests per branch).
const cell = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const chip = (ok, text, warn) => (
  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: ok ? '#E6F2EC' : (warn ? '#FBF6E9' : '#EEF0F3'), color: ok ? '#1F6E4C' : (warn ? '#6E5518' : '#8892a4') }}>{text}</span>
);

export function ComplianceClose() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'branches'], queryFn: getBranchCockpit, staleTime: 30_000, refetchInterval: 60_000 });
  const rows = (q.data && q.data.items) || [];

  return (
    <div>
      <p style={{ fontSize: 11.5, color: '#5a6691', margin: '0 0 10px' }}>
        <b>Branchwise</b> — each branch's close & compliance posture, on its own.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }} data-testid="tk-compliance">
          <thead>
            <tr>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Branch</th>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Period lock</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Pending decisions</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Pending governance</th>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((r) => {
              const locks = r.lockedPeriods || [];
              const pending = (r.pendingDecisions || 0) + (r.pendingGovernance || 0);
              const locked = locks.length > 0;
              const clear = pending === 0;
              return (
                <tr key={r.branch}>
                  <td style={{ ...cell, fontWeight: 700 }}>{r.branch}</td>
                  <td style={cell}>{locked ? chip(true, `Locked · ${locks[0]}`) : chip(false, 'Open', false)}</td>
                  <td style={num}>{r.pendingDecisions || 0}</td>
                  <td style={num}>{r.pendingGovernance || 0}</td>
                  <td style={cell}>{clear ? chip(true, 'Clear') : chip(false, `${pending} to clear`, true)}</td>
                </tr>
              );
            }) : <tr><td style={{ ...cell, color: '#777' }} colSpan={5}>No branch data.</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: '#8892a4', marginTop: 8 }}>Branchwise — never consolidated. "Locked" shows the latest hard-locked period; pending items are what the branch still needs cleared.</p>
    </div>
  );
}
