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
      className="tk-inbox-badge inline-block min-w-[16px] rounded-full bg-danger px-1.5 text-center text-[10px] font-bold leading-[14px] text-white"
      role="status"
      aria-label={`${count} pending approvals`}
    >
      {text}
    </span>
  );
}
