import React from 'react';
import { typeLabel } from './utils/inbox';
import { waitingRoles } from './utils/changeRequests';
import { Button } from '../../shell/primitives';

// ─── TK GROUP · FE · governance approvals list ───────────────────────────────
// Farhan / Owner approve or reject pending change-requests. Presentational: items
// and onAct(id, action) are passed in; a container wires getChangeRequests / actOn.
export function ChangeRequestList({ items = [], onAct }) {
  if (!items.length) {
    return <div className="tk-cr-empty p-3.5 text-xs text-ink-muted">No pending change-requests.</div>;
  }
  return (
    <ul className="m-0 list-none p-0">
      {items.map((cr) => (
        <li key={cr._id} className="flex items-center gap-2.5 border-b border-surface-border px-3 py-2.5 text-xs">
          <div className="flex-1">
            <span className="text-ink"><b>{typeLabel(cr.type)}</b>{cr.branch ? ` · ${cr.branch}` : ''}</span>
            <div className="mt-0.5 text-[11px] text-ink-muted">
              by {(cr.maker && (cr.maker.name || cr.maker.userId)) || '—'} · waiting: {waitingRoles(cr).join(' → ') || 'ready'}
            </div>
          </div>
          <Button type="button" variant="success" size="sm" onClick={() => onAct && onAct(cr._id, 'approve')}>Approve</Button>
          <Button type="button" variant="danger" size="sm" onClick={() => onAct && onAct(cr._id, 'reject')}>Reject</Button>
        </li>
      ))}
    </ul>
  );
}
