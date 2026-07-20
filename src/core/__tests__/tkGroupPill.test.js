// TK Group Central is a MODE, not a pill: a central role selecting the consolidated
// entity enters the control cockpit (the control layer becomes the whole nav, book-
// less). In a real branch the cockpit is NOT shown. The /tk pages stay controllable in
// Page Visibility Control regardless. These tests lock that architecture in.
import { getVisibleMenu } from '../../modules/tk-group/menu';
import { MENU_TK_GROUP, fullMenuRoots } from '../menus';
import { allPageKeys } from '../pageCatalog';

const hrefsOf = (nodes, out = []) => {
  (nodes || []).forEach((n) => {
    if (!n || n.divider) return;
    if (n.href) out.push(n.href);
    if (n.children) hrefsOf(n.children, out);
  });
  return out;
};
const labels = (roots) => (roots || []).map((r) => r && r.label);
const CENTRAL = { role: 'Super Admin' };
const CONTROL_ROUTES = [
  '/tk/control-tower', '/tk/approvals', '/tk/decisions', '/tk/onboarding', '/tk/period-locks',
  '/tk/targets', '/tk/master-control', '/tk/hr-control', '/tk/scorecard', '/tk/performance', '/tk/investment', '/tk/profitability',
  '/tk/receivables-payables', '/tk/exceptions', '/tk/compliance', '/tk/branch-cockpit', '/tk/audit', '/tk/go-live', '/tk/my-role', '/tk/roles',
  '/tk/tax-desk', '/tk/assets', '/tk/control-panel', '/tk/readiness', '/tk/voucher-approvals',
];

describe('TK Group Central — control cockpit mode', () => {
  test('a central role on the consolidated entity gets the full control cockpit', () => {
    const hrefs = hrefsOf(getVisibleMenu('ALL', CENTRAL));
    for (const r of CONTROL_ROUTES) expect(hrefs).toContain(r);
    // book-less: no branch ERP in the cockpit
    expect(hrefs).not.toContain('/receipts');
    expect(hrefs).not.toContain('/reports/pnl');
    expect(hrefs).not.toContain('/transactions/approvals');
  });

  test('in a real branch the cockpit is NOT shown (control is group-level)', () => {
    const hrefs = hrefsOf(getVisibleMenu({ code: 'BOM' }, CENTRAL));
    expect(hrefs).not.toContain('/tk/control-tower');
    expect(hrefs).not.toContain('/tk/approvals');
    expect(hrefs).toContain('/receipts');            // normal branch ERP
  });

  test('a non-central role never gets the cockpit even on the consolidated entity', () => {
    const hrefs = hrefsOf(getVisibleMenu('ALL', { role: 'Branch Accountant' }));
    expect(hrefs).not.toContain('/tk/control-tower');
  });

  test('the branch nav no longer carries a "TK Group" pill (it is a mode now)', () => {
    expect(labels(fullMenuRoots({ code: 'BOM' }, CENTRAL))).not.toContain('TK Group');
  });

  test('every TK Group page stays controllable in Page Visibility Control', () => {
    const keys = new Set(allPageKeys());
    for (const leaf of ['/tk/my-role', '/tk/go-live', '/tk/approvals', '/tk/onboarding', '/tk/period-locks', '/tk/targets', '/tk/master-control', '/tk/hr-control', '/tk/control-tower', '/tk/scorecard', '/tk/performance', '/tk/investment', '/tk/profitability', '/tk/receivables-payables', '/tk/exceptions', '/tk/compliance', '/tk/branch-cockpit', '/tk/audit', '/tk/roles', '/tk/tax-desk', '/tk/assets']) {
      expect(keys.has(leaf)).toBe(true);
    }
  });

  test('the page registry (MENU_TK_GROUP export) lists the /tk control routes', () => {
    const hrefs = MENU_TK_GROUP.children.filter((c) => c.href).map((c) => c.href);
    expect(hrefs).toEqual(expect.arrayContaining([
      '/tk/my-role', '/tk/go-live', '/tk/approvals', '/tk/onboarding',
      '/tk/period-locks', '/tk/targets', '/tk/master-control', '/tk/control-tower',
      '/tk/scorecard', '/tk/branch-cockpit', '/tk/audit',
    ]));
  });
});
