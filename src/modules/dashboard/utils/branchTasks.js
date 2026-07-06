// ─── Branch Accountant · "My Tasks" board (pure) ─────────────────────────────
// What the branch accountant must do / hasn't done — grouped, from LIVE book data
// (rejected vouchers to fix, their own entries awaiting Check, pending SO/PO/GP,
// ADMs past deadline, and branch alerts). Pure: it takes plain counts (the component
// pulls them from the existing hooks) so it is fully unit-testable. Read-only.
//
// This is the accountant's control checklist; the SAME open figures roll up to the
// Owner in the Branch Scorecard, so the accountant knows the work is measured.

// Group definitions in priority order (most urgent first). Each renders only when it
// has a non-zero count. Kept as data so the order + routes are testable.
const DEFS = [
  { key: 'rejected',       label: 'Returned — fix & resubmit', icon: '↩', tone: 'red',   route: '/transactions/voucher-approvals' },
  { key: 'awaitingMyCheck', label: 'Awaiting your check',       icon: '✎', tone: 'amber', route: '/transactions/voucher-approvals' },
  { key: 'overdueAdm',     label: 'ADM past dispute deadline',  icon: '📩', tone: 'red',   route: '/purchase/adm' },
  { key: 'pendingBookings', label: 'SO/PO/GP pending',          icon: '✈', tone: 'blue',  route: '/transactions/approvals' },
  { key: 'criticalAlerts', label: 'Critical alerts',            icon: '🔴', tone: 'red',   route: '/dashboard/alerts' },
  { key: 'warnAlerts',     label: 'Warnings',                   icon: '🟠', tone: 'amber', route: '/dashboard/alerts' },
];

/** Build the grouped task board from live counts.
 *  @param {Object} counts { rejected, awaitingMyCheck, overdueAdm, pendingBookings, criticalAlerts, warnAlerts }
 *  @returns {{ groups: Array, openTotal: number, allClear: boolean, urgent: number }} */
export function branchTaskBoard(counts = {}) {
  const n = (k) => Math.max(0, Math.floor(Number(counts[k]) || 0));
  const groups = DEFS
    .map((d) => ({ ...d, count: n(d.key) }))
    .filter((g) => g.count > 0);
  const openTotal = groups.reduce((s, g) => s + g.count, 0);
  const urgent = groups.filter((g) => g.tone === 'red').reduce((s, g) => s + g.count, 0);
  return { groups, openTotal, allClear: openTotal === 0, urgent };
}

export const _BRANCH_TASK_DEFS = DEFS;
