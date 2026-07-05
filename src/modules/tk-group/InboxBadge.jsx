import React from 'react';
import { badgeText } from './utils/inbox';

// ─── TK GROUP · FE · pending-approvals badge ─────────────────────────────────
// A small count badge for the app bar (the notification method chosen: in-app).
// Renders nothing when the inbox is empty. Presentational — count passed in.
export function InboxBadge({ count = 0 }) {
  const text = badgeText(count);
  if (!text) return null;
  return (
    <span
      className="tk-inbox-badge"
      role="status"
      aria-label={`${count} pending approvals`}
      style={{
        display: 'inline-block', background: '#A32F2F', color: '#fff', borderRadius: 20,
        fontSize: 10, fontWeight: 700, lineHeight: '14px', padding: '1px 6px',
        minWidth: 16, textAlign: 'center',
      }}
    >
      {text}
    </span>
  );
}
