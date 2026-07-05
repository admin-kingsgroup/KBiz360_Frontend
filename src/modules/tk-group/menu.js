import { getMenu } from '../../core/menus';
import { gateMenuForGroup, isGroupMode } from './utils/groupMode';
import { gateStatements } from './utils/statements';
import { controlCockpitMenu, isCentralRole } from './cockpit';

// ─── TK GROUP · FE · the nav's single entry point ────────────────────────────
// Two modes:
//   • TK GROUP CENTRAL — a central role selecting the consolidated entity ENTERS the
//     control cockpit: the control layer becomes the whole nav (book-less). This is
//     the "central control system", not a pill inside the branch ERP.
//   • BRANCH — normal branch ERP, with the hide-statements control applied for a
//     restricted (Branch Accountant) view (P&L / Balance Sheet stripped when on).
// getMenu() itself is left untouched (pure; still used by Page Visibility Control
// and every menu test); the mode logic lives here, at the shell's call site.
export function getVisibleMenu(branch, currentUser) {
  if (isGroupMode(branch) && isCentralRole(currentUser)) return controlCockpitMenu();
  const base = gateMenuForGroup(getMenu(branch, currentUser), branch);
  return gateStatements(base, !!(currentUser && currentUser.hideStatements));
}
