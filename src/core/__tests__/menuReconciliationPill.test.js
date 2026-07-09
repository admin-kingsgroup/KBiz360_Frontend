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
  test('pill has the certificate ladder AND the moved statement-matching screens', () => {
    expect(MENU_RECONCILIATION.label).toBe('Reconciliation');
    expect(allHrefs(MENU_RECONCILIATION)).toEqual([
      '/reconciliation', '/reconciliation/reports', '/reconciliation/rulebook',
      '/accounts/client-reco', '/bank-reco', '/finance/reco-queue',
      '/accounts/supplier-reco', '/accounts/interbranch-reco', '/accounts/tally-reco',
    ]);
  });

  test('shows for Super Admin, between Accounts and Reports', () => {
    const menu = getMenu('ALL', { role: 'Super Admin' });
    const ls = labels(menu);
    expect(ls).toContain('Reconciliation');
    expect(ls.indexOf('Reconciliation')).toBe(ls.indexOf('Accounts') + 1);
    expect(ls.indexOf('Reconciliation')).toBeLessThan(ls.indexOf('Reports'));
  });

  test('shows for Director and for the Branch Accountant (weekly preparer)', () => {
    expect(labels(getMenu('BOM', { role: 'Director' }))).toContain('Reconciliation');
    expect(labels(getMenu('BOM', { role: 'Branch Accountant' }))).toContain('Reconciliation');
  });

  test('the Accounts pill no longer carries ANY reconciliation screens', () => {
    expect(MENU_ACCOUNTS.children.find((c) => c.label === 'Reconciliation')).toBeUndefined();
    const all = allHrefs(MENU_ACCOUNTS);
    ['/reconciliation', '/accounts/client-reco', '/bank-reco', '/accounts/supplier-reco', '/finance/reco-queue', '/accounts/interbranch-reco', '/accounts/tally-reco']
      .forEach((h) => expect(all).not.toContain(h));
  });

  test('TK Group Central cockpit carries the Reconciliation pill (branch-wise oversight)', () => {
    const cockpit = controlCockpitMenu('', { role: 'Super Admin' });
    const pill = cockpit.find((p) => p && p.label === 'Reconciliation');
    expect(pill).toBeTruthy();
    expect(allHrefs(pill)).toEqual(['/reconciliation', '/reconciliation/reports', '/reconciliation/rulebook']);
    // and for the other central roles too (Director / FM / Sr. AE share the cockpit)
    const dirCockpit = controlCockpitMenu('', { role: 'Director' });
    expect(dirCockpit.some((p) => p && p.label === 'Reconciliation')).toBe(true);
  });

  test('breadcrumbs resolve under the Reconciliation pill', () => {
    expect(crumbsFor('/reconciliation').map((c) => c.label)).toEqual(['Reconciliation', 'Certificates & Closing', 'Reconciliation Hub']);
    expect(crumbsFor('/reconciliation/reports').map((c) => c.label)).toEqual(['Reconciliation', 'Certificates & Closing', 'Reports & Pending']);
    expect(crumbsFor('/reconciliation/rulebook').map((c) => c.label)).toEqual(['Reconciliation', 'Certificates & Closing', 'Rule Book & Process']);
  });
});
