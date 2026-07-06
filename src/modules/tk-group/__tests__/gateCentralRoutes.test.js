// The dormant menu-relocate transform: strips central-verdict routes off a branch
// menu when enabled, and is a pure no-op when not. Complements the Phase-0 guard
// test — that one tolerates the PENDING_MIGRATION routes on the branch surface
// today; THIS proves the transform that removes them at go-live actually works.
import { getMenu } from '../../../core/menus';
import { isCentral } from '../../../core/tkGateMap';
import { gateCentralRoutes } from '../utils/gateCentralRoutes';

function leafHrefs(node, out = []) {
  if (!node || node.divider) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => leafHrefs(c, out));
  return out;
}
const hrefsOf = (pills) => pills.flatMap((p) => leafHrefs(p));

const BRANCH_OBJ = { code: 'BOM', cur: '₹' };
const ACCOUNTANT = { role: 'Branch Accountant', branches: ['BOM'] };

describe('gateCentralRoutes — dormant by default', () => {
  test('disabled → returns the tree unchanged (no disruption to migration)', () => {
    const menu = getMenu(BRANCH_OBJ, ACCOUNTANT);
    expect(gateCentralRoutes(menu, false)).toBe(menu);
    expect(gateCentralRoutes(menu, undefined)).toBe(menu);
  });
  test('non-array input is returned as-is', () => {
    expect(gateCentralRoutes(null, true)).toBe(null);
  });
});

describe('gateCentralRoutes — enabled', () => {
  const menu = getMenu(BRANCH_OBJ, ACCOUNTANT);
  const gated = gateCentralRoutes(menu, true);
  const gatedRoutes = hrefsOf(gated);

  test('NO central route survives on the branch surface', () => {
    const leaks = gatedRoutes.filter((r) => isCentral(r));
    expect(leaks).toEqual([]);
  });

  test('the known PENDING_MIGRATION routes are gone', () => {
    for (const r of [
      '/masters/ledgers', '/masters/accounts-tree', '/masters/cost-centers',
      '/accounts/payment-run', '/accounting/vendor-advances', '/accounts/suspense',
      '/accounting/year-close', '/accounting/recurring', '/transactions/approvals',
    ]) {
      expect(gatedRoutes).not.toContain(r);
    }
  });

  test('branch operational routes are UNTOUCHED (no over-strip)', () => {
    // The accountant keeps daily entry, own-branch registers, books, reconciliation.
    for (const r of ['/journal', '/receipts', '/payments', '/day-book', '/ledger', '/reports/pnl', '/reports/sreg', '/bank-reco']) {
      expect(gatedRoutes).toContain(r);
    }
  });

  test('does not empty the menu — the accountant still has a usable workspace', () => {
    expect(gated.length).toBeGreaterThan(0);
    expect(gatedRoutes.length).toBeGreaterThan(15);
  });
});
