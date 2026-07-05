// ─── TK GROUP · FE · hide-statements gating (pure) ───────────────────────────
// A locked control-model decision: a Branch Accountant sees ledgers, registers and
// reconciliation — but NOT the financial statements (P&L / Balance Sheet). Those are
// the "Branch MIS" leaves. This is gated by the branch.hide_statements control flag,
// surfaced per-caller via /api/tk/my-role → activeControls, so it is DORMANT until
// the flag is switched on (empty controls → menu unchanged). Pure + unit-testable;
// the shell decides `hide` and threads it in.

// The formal financial statements withheld from a restricted (accountant) view.
const STATEMENT_HREFS = new Set(['/reports/pnl', '/reports/bs']);

/** Is this href one of the withheld financial statements? */
export function isStatementHref(href) {
  return STATEMENT_HREFS.has(href);
}

/** Return a new menu tree with the statement leaves removed when `hide` is true.
 *  `hide` false (the default / dormant state) returns the input unchanged. Groups
 *  that become empty are dropped. Pure. */
export function gateStatements(nodes, hide) {
  if (!hide || !Array.isArray(nodes)) return nodes;
  return nodes
    .map((n) => {
      if (n && n.href && isStatementHref(n.href)) return null;      // drop a statement leaf
      if (n && Array.isArray(n.children)) {
        const children = gateStatements(n.children, hide).filter(Boolean);
        if (!children.length && !n.href && !n.divider) return null; // drop a now-empty group
        return { ...n, children };
      }
      return n;
    })
    .filter(Boolean);
}

export const _STATEMENT_HREFS = STATEMENT_HREFS;
