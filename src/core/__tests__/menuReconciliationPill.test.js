// Verifies the NEW top-level "Reconciliation" pill: present for full-menu roles
// (between Accounts and Reports) AND for the Branch Accountant (who prepares the
// weekly certificates), carries the Hub + Rule Book leaves with unique hrefs,
// leaves the existing Accounts ▸ Reconciliation statement-matching group intact,
// and resolves breadcrumbs to Reconciliation › <leaf>.
import { getMenu, MENU_RECONCILIATION, MENU_ACCOUNTS } from '../menus';
import { crumbsFor } from '../routeMeta';
import { controlCockpitMenu } from '../../modules/tk-group/cockpit';

const labels = (menu) => menu.map((m) => m.label);
function allHrefs(node, out = []) {
  if (!node) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => allHrefs(c, out));
  return out;
}

describe('Reconciliation · top-level pill', () => {
  test('BRANCH pill = freeze-only (Daily & Weekly) + statement matching — NO certification, NO month+', () => {
    expect(MENU_RECONCILIATION.label).toBe('Statement Reconciliation');
    expect(allHrefs(MENU_RECONCILIATION)).toEqual([
      // Freeze — the branch deliverable (Daily & Weekly only)
      '/reconciliation/daily', '/reconciliation/weekly',
      // Reconciliation Hub — full-view dashboard for the freeze tiers
      '/reconciliation/hub/daily', '/reconciliation/hub/weekly',
      // Statement Matching
      '/accounts/client-reco', '/bank-reco', '/finance/reco-queue',
      '/accounts/supplier-reco', '/accounts/interbranch-reco', '/reconciliation/match-guide',
      // Reports — one per freeze tier
      '/reconciliation/reports/daily', '/reconciliation/reports/weekly',
      // Govern
      '/reconciliation/rulebook',
    ]);
    // No certification / month+ leaks onto the branch surface.
    ['/reconciliation/monthly', '/reconciliation/quarterly', '/reconciliation/yearly']
      .forEach((h) => expect(allHrefs(MENU_RECONCILIATION)).not.toContain(h));
  });

  test('shows for Super Admin, between Accounts and Reports; Tally NOT on the branch surface', () => {
    const menu = getMenu('ALL', { role: 'Super Admin' });
    const ls = labels(menu);
    expect(ls).toContain('Statement Reconciliation');
    expect(ls.indexOf('Statement Reconciliation')).toBe(ls.indexOf('Accounts') + 1);
    expect(ls.indexOf('Statement Reconciliation')).toBeLessThan(ls.indexOf('Reports'));
    // Tally Reconciliation is TK Group Central ONLY — never on the branch nav.
    expect(ls).not.toContain('Tally Reconciliation');
  });

  test('shows for Director and for the Branch Accountant (weekly preparer)', () => {
    expect(labels(getMenu('BOM', { role: 'Director' }))).toContain('Statement Reconciliation');
    expect(labels(getMenu('BOM', { role: 'Branch Accountant' }))).toContain('Statement Reconciliation');
  });

  test('the Accounts pill no longer carries ANY reconciliation screens', () => {
    expect(MENU_ACCOUNTS.children.find((c) => c.label === 'Reconciliation')).toBeUndefined();
    const all = allHrefs(MENU_ACCOUNTS);
    ['/reconciliation', '/accounts/client-reco', '/bank-reco', '/accounts/supplier-reco', '/finance/reco-queue', '/accounts/interbranch-reco', '/accounts/tally-reco']
      .forEach((h) => expect(all).not.toContain(h));
  });

  test('TK Group Central cockpit carries the certification ladder (Month+) + Daily/Weekly approvals + statement matching', () => {
    const cockpit = controlCockpitMenu('', { role: 'Super Admin' });
    const pill = cockpit.find((p) => p && p.label === 'Statement Reconciliation');
    expect(pill).toBeTruthy();
    expect(allHrefs(pill)).toEqual([
      // Approvals — the per-branch inbox + branch Daily & Weekly freezes land here
      '/reconciliation/inbox', '/reconciliation/daily', '/reconciliation/weekly', '/finance/reco-queue',
      // Certification — Month/Quarter/Year
      '/reconciliation/monthly', '/reconciliation/quarterly', '/reconciliation/yearly',
      // Hub + Reports — Month+
      '/reconciliation/hub/monthly', '/reconciliation/hub/quarterly', '/reconciliation/hub/yearly',
      '/reconciliation/reports/monthly', '/reconciliation/reports/quarterly', '/reconciliation/reports/yearly',
      // Statement Matching + Govern
      '/accounts/client-reco', '/bank-reco', '/finance/reco-queue',
      '/accounts/supplier-reco', '/accounts/interbranch-reco', '/reconciliation/match-guide',
      '/reconciliation/rulebook',
    ]);
    // Tally Reconciliation lives in the cockpit (TK Group Central only).
    expect(cockpit.some((p) => p && p.label === 'Tally Reconciliation')).toBe(true);
    // and for the other central roles too (Director / FM / Sr. AE share the cockpit)
    const dirCockpit = controlCockpitMenu('', { role: 'Director' });
    expect(dirCockpit.some((p) => p && p.label === 'Statement Reconciliation')).toBe(true);
  });

  test('breadcrumbs resolve under the Reconciliation pill', () => {
    expect(crumbsFor('/reconciliation/hub/weekly').map((c) => c.label)).toEqual(['Statement Reconciliation', 'Reconciliation Hub', 'Weekly Reconciliation']);
    expect(crumbsFor('/reconciliation/weekly').map((c) => c.label)).toEqual(['Statement Reconciliation', 'Freeze', 'Weekly Freeze']);
    expect(crumbsFor('/reconciliation/reports/monthly').map((c) => c.label)).toEqual(['Statement Reconciliation', 'Reports', 'Monthly Report']);
    expect(crumbsFor('/reconciliation/monthly').map((c) => c.label)).toEqual(['Statement Reconciliation', 'Certification', 'Monthly Certification']);
    expect(crumbsFor('/reconciliation/rulebook').map((c) => c.label)).toEqual(['Statement Reconciliation', 'Govern', 'Rule Book & Process']);
    // The Tally Reconciliation pill (now grouped Tie-Out / Vouchers / Help).
    expect(crumbsFor('/tally-reconciliation/monthly').map((c) => c.label)).toEqual(['Tally Reconciliation', 'Tie-Out', 'Monthly Tie-Out']);
    expect(crumbsFor('/accounts/tally-reco').map((c) => c.label)).toEqual(['Tally Reconciliation', 'Vouchers', 'Ledger Matcher (Day Book)']);
  });
});
