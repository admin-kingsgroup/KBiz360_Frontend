import React from 'react';
import { typeLabel } from './utils/inbox';
import { waitingRoles } from './utils/changeRequests';
import { classifySla, slaTone, SLA_LABEL, SLA_DEFAULT_HOURS } from './utils/approvalSla';
import { Button, Badge } from '../../shell/primitives';

// ─── TK GROUP · FE · governance approvals list ───────────────────────────────
// Farhan / Owner approve or reject pending change-requests. Presentational: items
// and onAct(id, action) are passed in; a container wires getChangeRequests / actOn.
// Each row carries its SLA state (on-time / at-risk / breached) against the Owner-set
// clearance SLA so nothing sits unseen — a summary strip escalates the backlog.
export function ChangeRequestList({ items = [], onAct, slaHours = SLA_DEFAULT_HOURS, now = Date.now() }) {
  if (!items.length) {
    return <div className="tk-cr-empty p-3.5 text-xs text-ink-muted">No pending change-requests.</div>;
  }
  const { rows, summary } = classifySla(items, now, slaHours);
  return (
    <div>
      <div data-testid="tk-cr-sla" className="flex flex-wrap items-center gap-2 border-b border-surface-border px-3 py-2 text-[11px] text-ink-muted">
        <span>SLA {slaHours}h:</span>
        <Badge tone="danger" size="sm">{summary.breached} breached</Badge>
        <Badge tone="warning" size="sm">{summary['at-risk']} at risk</Badge>
        <Badge tone="success" size="sm">{summary.ontime} on time</Badge>
      </div>
      <ul className="m-0 list-none p-0">
        {rows.map((cr) => (
          <li key={cr._id} className="flex items-center gap-2.5 border-b border-surface-border px-3 py-2.5 text-xs">
            <div className="flex-1">
              <span className="text-ink"><b>{typeLabel(cr.type)}</b>{cr.branch ? ` · ${cr.branch}` : ''}</span>
              <div className="mt-0.5 text-[11px] text-ink-muted">
                by {(cr.maker && (cr.maker.name || cr.maker.userId)) || '—'} · waiting: {waitingRoles(cr).join(' → ') || 'ready'} · {`${cr.sla.ageHours}h old`}
              </div>
            </div>
            <Badge tone={slaTone(cr.sla.state)} size="sm">{SLA_LABEL[cr.sla.state]}</Badge>
            <Button type="button" variant="success" size="sm" onClick={() => onAct && onAct(cr._id, 'approve')}>Approve</Button>
            <Button type="button" variant="danger" size="sm" onClick={() => onAct && onAct(cr._id, 'reject')}>Reject</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
