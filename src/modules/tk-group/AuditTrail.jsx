import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAudit } from './api/monitor';
import { actorName } from './utils/monitor';

// ─── TK GROUP · FE · Audit Trail Explorer (container) ────────────────────────
// The append-only control_events log, filterable by branch / action / date — the
// "prove what happened" view. Read-only.
const cell = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left', verticalAlign: 'top' };
const inp = { padding: '5px 8px', fontSize: 12, border: '1px solid #cdd1d8', borderRadius: 5 };

export function AuditTrail() {
  const [branch, setBranch] = useState('');
  const [action, setAction] = useState('');
  const [applied, setApplied] = useState({});
  const q = useQuery({ queryKey: ['tk', 'monitor', 'audit', applied], queryFn: () => getAudit(applied), staleTime: 15_000 });
  const rows = (q.data && q.data.items) || [];

  const apply = (e) => { e.preventDefault(); setApplied({ ...(branch ? { branch } : {}), ...(action ? { action } : {}) }); };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <form onSubmit={apply} aria-label="Filter audit trail" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input aria-label="Branch" placeholder="Branch (e.g. BOM)" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ ...inp, width: 130 }} />
        <input aria-label="Action" placeholder="Action (e.g. approval.approve)" value={action} onChange={(e) => setAction(e.target.value)} style={{ ...inp, width: 200 }} />
        <button type="submit" style={{ background: '#0d1326', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer' }}>Filter</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="tk-audit">
        <thead>
          <tr>{['When', 'Action', 'By', 'Branch', 'Reason'].map((h) => <th key={h} style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((e, i) => (
            <tr key={e._id || i}>
              <td style={{ ...cell, whiteSpace: 'nowrap' }}>{e.ts ? String(e.ts).slice(0, 19).replace('T', ' ') : '—'}</td>
              <td style={cell}>{e.action}</td>
              <td style={cell}>{actorName(e.actor)}</td>
              <td style={cell}>{e.branch || '—'}</td>
              <td style={{ ...cell, color: '#777' }}>{e.reason || '—'}</td>
            </tr>
          )) : <tr><td style={{ ...cell, color: '#777' }} colSpan={5}>No control events match.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
