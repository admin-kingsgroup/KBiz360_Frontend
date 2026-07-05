import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare } from 'lucide-react';
import { getInbox } from './api/inbox';
import { InboxBadge } from './InboxBadge';
import { FULL_SCOPE_ROLES } from '../../core/branchScope';

// ─── TK GROUP · FE · live pending-approvals badge (app-bar) ───────────────────
// The in-app notification the Owner chose. Polls the caller's TK Group inbox and,
// when something is waiting on them, shows a clickable badge that opens the
// Approvals Inbox. Only the central-control roles poll/see it (everyone else's
// inbox is always empty), and it renders NOTHING at count 0 — so it is invisible
// and inert until the control layer actually has work, i.e. dormant-safe.
export function InboxBadgeLive({ currentUser, setRoute }) {
  const central = FULL_SCOPE_ROLES.includes(currentUser && currentUser.role);
  const q = useQuery({
    queryKey: ['tk', 'inbox'],
    queryFn: getInbox,
    enabled: central,          // non-central roles never poll
    refetchInterval: 60_000,   // gentle refresh; the inbox fails soft to empty
    staleTime: 30_000,
  });
  if (!central) return null;
  const count = (q.data && q.data.count) || 0;
  if (!count) return null;

  return (
    <button
      type="button"
      onClick={() => setRoute && setRoute('/tk/approvals')}
      aria-label={`${count} pending approvals — open the Approvals Inbox`}
      title="Pending approvals"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors duration-fast hover:bg-ink/[0.06] hover:text-ink focus:outline-none focus-visible:shadow-focus-ring"
    >
      <CheckSquare size={18} />
      <span className="absolute right-0.5 top-0.5"><InboxBadge count={count} /></span>
    </button>
  );
}
