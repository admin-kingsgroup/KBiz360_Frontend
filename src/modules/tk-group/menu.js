import { getMenu, applyHidden } from '../../core/menus';
import { gateMenuForGroup, isGroupMode } from './utils/groupMode';
import { gateStatements } from './utils/statements';
import { gateCentralRoutes } from './utils/gateCentralRoutes';
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
export function getVisibleMenu(branch, currentUser, focus) {
  // The cockpit tree bypasses getMenu(), so it needs the SAME hidden-deny-list pruning
  // applied here — otherwise a page toggled off in Page Visibility Control (e.g. the
  // Approvals dropdown's Admin Approval / Onboarding) would still show as a link in
  // the cockpit nav and only fail once clicked (App.jsx's route guard is generic and
  // already blocks it either way).
  if (isGroupMode(branch) && isCentralRole(currentUser)) return applyHidden(controlCockpitMenu(focus, currentUser), currentUser);
  const base = gateMenuForGroup(getMenu(branch, currentUser), branch);
  // Relocate central screens off the branch surface (dormant until the flag is on) —
  // then apply the hide-statements control. Both fail-safe: false → unchanged.
  const relocated = gateCentralRoutes(base, !!(currentUser && currentUser.relocateCentral));
  return gateStatements(relocated, !!(currentUser && currentUser.hideStatements));
}
