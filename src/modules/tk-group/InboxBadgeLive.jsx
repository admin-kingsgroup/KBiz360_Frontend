import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare } from 'lucide-react';
import { getInbox } from './api/inbox';
import { InboxBadge } from './InboxBadge';
import { InboxPanel } from './InboxPanel';
import { FULL_SCOPE_ROLES } from '../../core/branchScope';

// Matches ContextBar's own LINE constant — its buttons (Print, Bell, FY) are all
// bordered with this color, so the trigger here needs it too for visual parity.
const LINE = '#e1e3ec';

// ─── TK GROUP · FE · live pending-approvals badge (ContextBar) ────────────────
// The in-app notification the Owner chose. Polls the caller's TK Group inbox and,
// when something is waiting on them, shows a count badge. Clicking it opens a quick-
// peek dropdown (InboxPanel) listing the pending items, with a link to the full
// Approvals Inbox. Only the central-control roles poll/see it (everyone else's inbox
// is always empty), and it renders NOTHING at count 0 — dormant-safe.
//
// Dropdown is portalled to <body> (fixed-positioned off the trigger's rect) rather
// than absolutely positioned in place — the ContextBar row it lives in clips
// overflow (for the breadcrumb/parked-items ellipsis), which silently hid this
// panel when it was an in-flow absolute child. Matches ScreenBadge's popover.
export function InboxBadgeLive({ currentUser, setRoute }) {
  const central = FULL_SCOPE_ROLES.includes(currentUser && currentUser.role);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const q = useQuery({
    queryKey: ['tk', 'inbox'],
    queryFn: getInbox,
    enabled: central,          // non-central roles never poll
    refetchInterval: 60_000,   // gentle refresh; the inbox fails soft to empty
    staleTime: 30_000,
  });

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  }, []);

  // Close the dropdown on an outside click or Esc; reflow its position on resize/scroll.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-inbox-panel]')) return; // portaled panel
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const reflow = () => place();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [open, place]);

  if (!central) return null;
  const count = (q.data && q.data.count) || 0;
  const items = (q.data && q.data.items) || [];
  if (!count) return null;

  const viewAll = () => { setOpen(false); if (setRoute) setRoute('/tk/approvals'); };

  // Trigger + badge match the ContextBar Bell button pixel-for-pixel (same 26px
  // bordered pill, same corner badge recipe) — the badge is a SIBLING positioned
  // off the wrapping span, not a child of the button, exactly like the Bell's.
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setOpen((o) => { if (!o) place(); return !o; })}
          aria-label={`${count} pending approvals`}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Pending approvals"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 26, padding: '0 7px', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, color: '#0d1326', cursor: 'pointer' }}
        >
          <CheckSquare size={14} />
        </button>
        <InboxBadge count={count} />
      </span>

      {open && pos && createPortal(
        <div
          role="menu"
          data-inbox-panel
          className="overflow-y-auto rounded-brand border border-surface-border bg-surface shadow-pop"
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 599, width: 288, maxHeight: 360 }}
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
        </div>,
        document.body,
      )}
    </div>
  );
}
