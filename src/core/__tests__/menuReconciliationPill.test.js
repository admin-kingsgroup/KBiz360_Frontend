// Verifies the NEW top-level "Reconciliation" pill: present for full-menu roles
// (between Accounts and Reports) AND for the Branch Accountant (who prepares the
// weekly certificates), carries the Hub + Rule Book leaves with unique hrefs,
// leaves the existing Accounts ▸ Reconciliation statement-matching group intact,
// and resolves breadcrumbs to Reconciliation › <leaf>.
import { getMenu, MENU_RECONCILIATION, MENU_ACCOUNTS } from '../menus';
import { crumbsFor } from '../routeMeta';

const labels = (menu) => menu.map((m) => m.label);
function allHrefs(node, out = []) {
  if (!node) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => allHrefs(c, out));
  return out;
}

describe('Reconciliation · top-level pill', () => {
  test('pill exists with the Hub, Reports & Pending and Rule Book leaves', () => {
    expect(MENU_RECONCILIATION.label).toBe('Reconciliation');
    expect(allHrefs(MENU_RECONCILIATION)).toEqual(['/reconciliation', '/reconciliation/reports', '/reconciliation/rulebook']);
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

  test('does not disturb the Accounts ▸ Reconciliation statement-matching group', () => {
    const group = MENU_ACCOUNTS.children.find((c) => c.label === 'Reconciliation');
    expect(group).toBeTruthy();
    expect(allHrefs(group)).toEqual(expect.arrayContaining(['/accounts/client-reco', '/bank-reco', '/accounts/supplier-reco']));
    // and the new pill's routes don't leak into Accounts
    expect(allHrefs(MENU_ACCOUNTS)).not.toContain('/reconciliation');
  });

  test('breadcrumbs resolve under the Reconciliation pill', () => {
    expect(crumbsFor('/reconciliation').map((c) => c.label)).toEqual(['Reconciliation', 'Reconciliation Hub']);
    expect(crumbsFor('/reconciliation/reports').map((c) => c.label)).toEqual(['Reconciliation', 'Reports & Pending']);
    expect(crumbsFor('/reconciliation/rulebook').map((c) => c.label)).toEqual(['Reconciliation', 'Rule Book & Process']);
  });
});
