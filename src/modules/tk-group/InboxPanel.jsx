import React from 'react';
import { typeLabel } from './utils/inbox';

// ─── TK GROUP · FE · approvals inbox panel ───────────────────────────────────
// Read-only list of the change-requests waiting on you. Presentational (items are
// passed in; the container fetches via api/inbox.getInbox()).
export function InboxPanel({ items = [] }) {
  if (!items.length) {
    return <div className="tk-inbox-empty p-3.5 text-xs text-ink-muted">Nothing waiting on you.</div>;
  }
  return (
    <ul className="tk-inbox-list m-0 list-none p-0">
      {items.map((it) => (
        <li key={it._id || `${it.type}-${it.branch}`} className="border-b border-surface-divider px-3 py-2 text-xs">
          <span><b>{typeLabel(it.type)}</b>{it.branch ? ` · ${it.branch}` : ''}</span>
          <div className="mt-0.5 text-[11px] text-ink-muted">
            {(it.maker && (it.maker.name || it.maker.userId)) || 'submitted'}
          </div>
        </li>
      ))}
    </ul>
  );
}
