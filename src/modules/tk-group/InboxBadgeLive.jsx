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
          style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, width: 288, maxHeight: 360, overflowY: 'auto', background: '#fff', border: '1px solid #e3e6ec', borderRadius: 8, boxShadow: '0 8px 28px -12px rgba(16,18,22,0.28)', zIndex: 50 }}
        >
          <div style={{ padding: '9px 12px', borderBottom: '1px solid #eee', fontSize: 12, fontWeight: 700, color: '#1f2a44' }}>
            Waiting on you ({count})
          </div>
          <InboxPanel items={items} />
          <button
            type="button"
            onClick={viewAll}
            style={{ width: '100%', padding: '9px 12px', border: 'none', borderTop: '1px solid #eee', background: '#f7f8fa', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
          >
            View all in Approvals Inbox →
          </button>
        </div>
      ) : null}
    </div>
  );
}
