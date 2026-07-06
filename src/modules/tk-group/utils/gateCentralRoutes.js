// ─── TK GROUP · FE · relocate central routes off the branch surface (pure) ───
// The menu counterpart to the server write-guards: when the "central relocated"
// control is ON, every route the Phase-0 gate-map marks `central` is stripped from
// a branch menu tree (masters, money-out release, period-close, approval authority,
// etc.) so a Branch Accountant only sees what they operate. Central roles reach the
// same screens in TK Group Central (the cockpit menu), so nothing is lost — it moves.
//
// DORMANT by default: with `enabled` false this returns the tree UNCHANGED, so it
// ships with zero effect and does NOT disrupt the go-live migration (Faiz/Sughra keep
// full access until the Owner flips it — the menu twin of core.policy_guard). Pure &
// unit-testable; wiring it into getVisibleMenu behind the flag is a separate live step.
// Mirrors utils/groupMode.js + utils/statements.js (logic here, wiring separate).

import { isCentral } from '../../../core/tkGateMap';

function prune(node) {
  if (!node || node.divider) return node || null;
  if (node.href && isCentral(node.href)) return null;           // drop a central leaf
  if (Array.isArray(node.children)) {
    const children = node.children.map(prune).filter(Boolean);
    // Drop a group left with no navigable child (unless it is itself navigable).
    const hasLeaf = children.some((k) => k && (k.href || (k.children && k.children.length)));
    if (!hasLeaf && !node.href) return null;
    return { ...node, children };
  }
  return node;
}

/** Strip `central`-verdict routes from a (branch) menu when enabled. Non-enabled or
 *  non-array input returns the input unchanged (dormant / fail-safe). Pure. */
export function gateCentralRoutes(nodes, enabled) {
  if (!enabled || !Array.isArray(nodes)) return nodes;
  return nodes.map(prune).filter(Boolean);
}
