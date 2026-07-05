// ─── TK GROUP · FE · Group Mode menu gating (pure) ───────────────────────────
// In Group (consolidated / "ALL") mode you can't post into "all branches", so the
// data-entry menu items make no sense there. This pure helper strips them from a
// menu tree when the branch selector is on ALL — the fix for the original problem
// (data-entry options showing in the group view). Wiring it into getMenu() is a
// separate, live step; this is just the logic, fully unit-testable.

// The data-entry routes that are meaningless in group mode.
const ENTRY_HREFS = new Set([
  '/bookings/new', '/bookings/inter-branch',
  '/receipts', '/payments', '/contra',
  '/journal', '/purchase-expense', '/debit-note',
  '/finance/refund', '/finance/refund-partial', '/finance/reissue',
  '/finance/adm-voucher', '/finance/acm-voucher',
]);

/** True when the selector is on the consolidated group view. */
export function isGroupMode(branch) {
  return branch === 'ALL' || !!(branch && branch.code === 'ALL');
}

/** Is this href a per-branch data-entry screen? */
export function isEntryHref(href) {
  return ENTRY_HREFS.has(href);
}

/** Return a new menu tree with data-entry leaves removed when in group mode.
 *  Non-group mode (a real branch) returns the input unchanged. Groups that become
 *  empty (all their children were data-entry) are dropped. Pure. */
export function gateMenuForGroup(nodes, branch) {
  if (!isGroupMode(branch) || !Array.isArray(nodes)) return nodes;
  return nodes
    .map((n) => {
      if (n && n.href && isEntryHref(n.href)) return null;         // drop a data-entry leaf
      if (n && Array.isArray(n.children)) {
        const children = gateMenuForGroup(n.children, branch).filter(Boolean);
        if (!children.length && !n.href && !n.divider) return null; // drop a now-empty group
        return { ...n, children };
      }
      return n;
    })
    .filter(Boolean);
}

export const _ENTRY_HREFS = ENTRY_HREFS;
