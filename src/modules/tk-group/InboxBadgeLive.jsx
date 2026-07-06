import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare } from 'lucide-react';
import { getInbox } from './api/inbox';
import { InboxBadge } from './InboxBadge';
import { InboxPanel } from './InboxPanel';
import { FULL_SCOPE_ROLES } from '../../core/branchScope';

// ─── TK GROUP · FE · live pending-approvals badge (app-bar) ───────────────────
// The in-app notification the Owner chose. Polls the caller's TK Group inbox and,
// when something is waiting on them, shows a count badge. Clicking it opens a quick-
// peek dropdown (InboxPanel) listing the pending items, with a link to the full
// Approvals Inbox. Only the central-control roles poll/see it (everyone else's inbox
// is always empty), and it renders NOTHING at count 0 — dormant-safe.
export function InboxBadgeLive({ currentUser, setRoute }) {
  const central = FULL_SCOPE_ROLES.includes(currentUser && currentUser.role);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const q = useQuery({
    queryKey: ['tk', 'inbox'],
    queryFn: getInbox,
    enabled: central,          // non-central roles never poll
    refetchInterval: 60_000,   // gentle refresh; the inbox fails soft to empty
    staleTime: 30_000,
  });

  // Close the dropdown on an outside click or Esc.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!central) return null;
  const count = (q.data && q.data.count) || 0;
  const items = (q.data && q.data.items) || [];
  if (!count) return null;

  const viewAll = () => { setOpen(false); if (setRoute) setRoute('/tk/approvals'); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`${count} pending approvals`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Pending approvals"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors duration-fast hover:bg-ink/[0.06] hover:text-ink focus:outline-none focus-visible:shadow-focus-ring"
      >
        <CheckSquare size={18} />
        <span className="absolute right-0.5 top-0.5"><InboxBadge count={count} /></span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 overflow-y-auto rounded-brand border border-surface-border bg-surface shadow-pop"
          style={{ width: 288, maxHeight: 360 }}
        >
          <div className="border-b border-surface-divider px-3 py-2 text-xs font-bold text-navy">
            Waiting on you ({count})
          </div>
          <InboxPanel items={items} />
          <button
            type="button"
            onClick={viewAll}
            className="w-full border-t border-surface-divider bg-surface-alt px-3 py-2 text-center text-xs font-semibold text-info transition-colors duration-fast hover:bg-ink/[0.04]"
          >
            View all in Approvals Inbox →
          </button>
        </div>
      ) : null}
    </div>
  );
}
