import React from 'react';
import { typeLabel } from './utils/inbox';
import { waitingRoles } from './utils/changeRequests';

// ─── TK GROUP · FE · governance approvals list ───────────────────────────────
// Farhan / Owner approve or reject pending change-requests. Presentational: items
// and onAct(id, action) are passed in; a container wires getChangeRequests / actOn.
const btn = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 5,
  fontSize: 11, fontWeight: 600, padding: '5px 10px', cursor: 'pointer',
});

export function ChangeRequestList({ items = [], onAct }) {
  if (!items.length) {
    return <div className="tk-cr-empty" style={{ padding: 14, color: '#777', fontSize: 12.5 }}>No pending change-requests.</div>;
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((cr) => (
        <li key={cr._id} style={{ padding: '10px 12px', borderBottom: '1px solid #eee', display: 'flex', gap: 10, alignItems: 'center', fontSize: 12.5 }}>
          <div style={{ flex: 1 }}>
            <span><b>{typeLabel(cr.type)}</b>{cr.branch ? ` · ${cr.branch}` : ''}</span>
            <div style={{ color: '#777', fontSize: 11, marginTop: 2 }}>
              by {(cr.maker && (cr.maker.name || cr.maker.userId)) || '—'} · waiting: {waitingRoles(cr).join(' → ') || 'ready'}
            </div>
          </div>
          <button type="button" onClick={() => onAct && onAct(cr._id, 'approve')} style={btn('#1F6E4C')}>Approve</button>
          <button type="button" onClick={() => onAct && onAct(cr._id, 'reject')} style={btn('#A32F2F')}>Reject</button>
        </li>
      ))}
    </ul>
  );
}
