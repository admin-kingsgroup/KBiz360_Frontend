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
  test('pill = per-tier certificate pages + per-tier reports + the moved statement-matching screens', () => {
    expect(MENU_RECONCILIATION.label).toBe('Statement Reconciliation');
    expect(allHrefs(MENU_RECONCILIATION)).toEqual([
      // Reconciliation Hub — the full-view dashboard, one entry per tier (first)
      '/reconciliation/hub/weekly', '/reconciliation/hub/monthly', '/reconciliation/hub/quarterly', '/reconciliation/hub/yearly',
      // Certification — one entry per tier, Rule Book last
      '/reconciliation/weekly', '/reconciliation/monthly', '/reconciliation/quarterly', '/reconciliation/yearly',
      '/reconciliation/rulebook',
      // Reports — one report per tier
      '/reconciliation/reports/weekly', '/reconciliation/reports/monthly',
      '/reconciliation/reports/quarterly', '/reconciliation/reports/yearly',
      // Statement Matching
      '/accounts/client-reco', '/bank-reco', '/finance/reco-queue',
      '/accounts/supplier-reco', '/accounts/interbranch-reco', '/accounts/tally-reco',
      '/reconciliation/match-guide', // the staff Match Guide — LAST under Statement Matching
    ]);
  });

  test('shows for Super Admin, between Accounts and Reports', () => {
    const menu = getMenu('ALL', { role: 'Super Admin' });
    const ls = labels(menu);
    expect(ls).toContain('Statement Reconciliation');
    expect(ls.indexOf('Statement Reconciliation')).toBe(ls.indexOf('Accounts') + 1);
    expect(ls.indexOf('Statement Reconciliation')).toBeLessThan(ls.indexOf('Reports'));
    // The new whole-books Tally Reconciliation pill sits right after it.
    expect(ls.indexOf('Tally Reconciliation')).toBe(ls.indexOf('Statement Reconciliation') + 1);
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

  test('TK Group Central cockpit carries the FULL Reconciliation pill (per-tier certs + reports + statement matching)', () => {
    const cockpit = controlCockpitMenu('', { role: 'Super Admin' });
    const pill = cockpit.find((p) => p && p.label === 'Statement Reconciliation');
    expect(pill).toBeTruthy();
    expect(allHrefs(pill)).toEqual([
      '/reconciliation/hub/weekly', '/reconciliation/hub/monthly', '/reconciliation/hub/quarterly', '/reconciliation/hub/yearly',
      '/reconciliation/weekly', '/reconciliation/monthly', '/reconciliation/quarterly', '/reconciliation/yearly',
      '/reconciliation/reports/weekly', '/reconciliation/reports/monthly',
      '/reconciliation/reports/quarterly', '/reconciliation/reports/yearly',
      '/accounts/client-reco', '/bank-reco', '/finance/reco-queue',
      '/accounts/supplier-reco', '/accounts/interbranch-reco', '/accounts/tally-reco',
      '/reconciliation/match-guide',
      '/reconciliation/rulebook',
    ]);
    // and for the other central roles too (Director / FM / Sr. AE share the cockpit)
    const dirCockpit = controlCockpitMenu('', { role: 'Director' });
    expect(dirCockpit.some((p) => p && p.label === 'Statement Reconciliation')).toBe(true);
  });

  test('breadcrumbs resolve under the Reconciliation pill', () => {
    expect(crumbsFor('/reconciliation/hub/weekly').map((c) => c.label)).toEqual(['Statement Reconciliation', 'Reconciliation Hub', 'Weekly Reconciliation']);
    expect(crumbsFor('/reconciliation/weekly').map((c) => c.label)).toEqual(['Statement Reconciliation', 'Certification', 'Weekly Certification']);
    expect(crumbsFor('/reconciliation/reports/monthly').map((c) => c.label)).toEqual(['Statement Reconciliation', 'Reports', 'Monthly Report']);
    expect(crumbsFor('/reconciliation/rulebook').map((c) => c.label)).toEqual(['Statement Reconciliation', 'Certification', 'Rule Book & Process']);
    // The new Tally Reconciliation pill resolves its own crumbs.
    expect(crumbsFor('/tally-reconciliation/monthly').map((c) => c.label)).toEqual(['Tally Reconciliation', 'Monthly Tie-Out']);
  });
});
