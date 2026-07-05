import { getMenu } from '../../core/menus';
import { gateMenuForGroup } from './utils/groupMode';
import { gateStatements } from './utils/statements';

// ─── TK GROUP · FE · group- & control-aware menu ─────────────────────────────
// The nav's single entry point once TK Group is in play. It is the app's real
// getMenu() with two control-model rules layered on:
//   • Group view (branch = "ALL") strips per-branch data-entry items — you can't
//     post "into all branches" (the original defect: data-entry in the group view).
//   • A restricted (Branch Accountant) view with the branch.hide_statements control
//     ON drops the financial statements (P&L / Balance Sheet). The shell passes the
//     resolved flag on currentUser.hideStatements; absent/false → nothing changes.
// getMenu() itself is left untouched (pure; still used by Page Visibility Control
// and every menu test); the control rules live here, at the shell's call site.
export function getVisibleMenu(branch, currentUser) {
  const base = gateMenuForGroup(getMenu(branch, currentUser), branch);
  return gateStatements(base, !!(currentUser && currentUser.hideStatements));
}
