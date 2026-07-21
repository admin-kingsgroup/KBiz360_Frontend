import React from 'react';
import { badgeText } from './utils/inbox';

// ─── TK GROUP · FE · pending-approvals badge ─────────────────────────────────
// A small count badge for the app bar (the notification method chosen: in-app).
// Renders nothing when the inbox is empty. Presentational — count passed in.
// Self-positions in the top-right corner of its (relatively-positioned) wrapper —
// same recipe as the ContextBar Bell's unread badge, so the two look identical.
export function InboxBadge({ count = 0 }) {
  const text = badgeText(count);
  if (!text) return null;
  return (
    <span
      className="tk-inbox-badge"
      role="status"
      aria-label={`${count} pending approvals`}
      style={{
        position: 'absolute', top: -4, right: -4, display: 'flex', height: 15, minWidth: 15,
        alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '2px solid #fff',
        background: '#dc2626', padding: '0 3px', fontSize: 8.5, fontWeight: 800, color: '#fff',
      }}
    >
      {text}
    </span>
  );
}
