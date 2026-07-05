import React from 'react';
import { typeLabel } from './utils/inbox';

// ─── TK GROUP · FE · approvals inbox panel ───────────────────────────────────
// Read-only list of the change-requests waiting on you. Presentational (items are
// passed in; the container fetches via api/inbox.getInbox()).
export function InboxPanel({ items = [] }) {
  if (!items.length) {
    return <div className="tk-inbox-empty" style={{ padding: '14px', color: '#777', fontSize: 12.5 }}>Nothing waiting on you.</div>;
  }
  return (
    <ul className="tk-inbox-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((it) => (
        <li key={it._id || `${it.type}-${it.branch}`} style={{ padding: '9px 12px', borderBottom: '1px solid #eee', fontSize: 12.5 }}>
          <span><b>{typeLabel(it.type)}</b>{it.branch ? ` · ${it.branch}` : ''}</span>
          <div style={{ color: '#777', fontSize: 11, marginTop: 2 }}>
            {(it.maker && (it.maker.name || it.maker.userId)) || 'submitted'}
          </div>
        </li>
      ))}
    </ul>
  );
}
