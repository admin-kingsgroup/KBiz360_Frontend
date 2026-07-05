// TK Group is the central-control pill. It must be visible ONLY to the all-branch
// governance roles (Owner / Director / Finance Manager / Sr. Accounts Executive),
// while its pages stay controllable in Page Visibility Control regardless of the
// nav gate. These tests lock that contract in.
import { getMenu, fullMenuRoots, MENU_TK_GROUP } from '../menus';
import { FULL_SCOPE_ROLES } from '../branchScope';
import { allPageKeys } from '../pageCatalog';

const labels = (roots) => roots.map((r) => r && r.label);
const BR = { code: 'BOM' };

describe('TK Group pill — central-control gating', () => {
  test.each(FULL_SCOPE_ROLES)('central role "%s" sees the TK Group pill', (role) => {
    expect(labels(fullMenuRoots(BR, { role }))).toContain('TK Group');
  });

  test('a full-menu but non-central role (HR Manager) does NOT see it', () => {
    expect(labels(fullMenuRoots(BR, { role: 'HR Manager' }))).not.toContain('TK Group');
  });

  test('a Branch Accountant (restricted menu) does NOT see it', () => {
    expect(labels(getMenu(BR, { role: 'Branch Accountant' }))).not.toContain('TK Group');
  });

  test('its pages stay controllable in Page Visibility Control regardless of the gate', () => {
    const keys = new Set(allPageKeys());
    for (const leaf of ['/tk/my-role', '/tk/approvals', '/tk/controls', '/tk/period-locks', '/tk/control-tower', '/tk/branch-cockpit', '/tk/audit']) {
      expect(keys.has(leaf)).toBe(true);
    }
  });

  test('the pill exposes exactly the governance + monitoring routes', () => {
    const hrefs = MENU_TK_GROUP.children.filter((c) => c.href).map((c) => c.href);
    expect(hrefs.sort()).toEqual([
      '/tk/approvals', '/tk/audit', '/tk/branch-cockpit', '/tk/control-tower',
      '/tk/controls', '/tk/my-role', '/tk/period-locks',
    ]);
  });
});
