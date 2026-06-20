// Verifies the dedicated "Reconciliation" head consolidates every non-tax recon
// screen under the Accounts pill, that the moved items are not left duplicated in
// their old groups, that breadcrumbs point at the new location, and that the GST
// recon screens are grouped under a "Reconciliation" divider in the Taxation pill.
import { MENU_ACCOUNTS } from '../core/menus';
import { TAX_INDIA } from '../core/data';
import { crumbsFor } from '../core/routeMeta';

const groupByLabel = (menu, label) => menu.children.find((c) => c.label === label);
const hrefs = (group) => (group?.children || []).map((c) => c.href).filter(Boolean);

// Collect every href under a menu group/pill (one level of nesting is enough here).
function allHrefs(node, out = []) {
  if (!node) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => allHrefs(c, out));
  return out;
}

describe('Accounts ▸ Reconciliation head', () => {
  const recon = groupByLabel(MENU_ACCOUNTS, 'Reconciliation');

  test('the Reconciliation group exists under Accounts', () => {
    expect(recon).toBeTruthy();
    expect(Array.isArray(recon.children)).toBe(true);
  });

  test('it contains bank, supplier and queue reconciliation', () => {
    expect(hrefs(recon)).toEqual(
      expect.arrayContaining(['/bank-reco', '/accounts/supplier-reco', '/finance/reco-queue']),
    );
  });

  test('moved items are not duplicated in their old groups', () => {
    expect(hrefs(groupByLabel(MENU_ACCOUNTS, 'Cash & Bank'))).not.toContain('/bank-reco');
    expect(hrefs(groupByLabel(MENU_ACCOUNTS, 'Cash & Bank'))).not.toContain('/finance/reco-queue');
    expect(hrefs(groupByLabel(MENU_ACCOUNTS, 'Payables & Suppliers'))).not.toContain('/accounts/supplier-reco');
  });

  test('each recon route appears exactly once in the Accounts pill', () => {
    const all = allHrefs(MENU_ACCOUNTS);
    ['/bank-reco', '/accounts/supplier-reco', '/finance/reco-queue'].forEach((h) => {
      expect(all.filter((x) => x === h)).toHaveLength(1);
    });
  });

  test('breadcrumbs resolve to Accounts › Reconciliation › <leaf>', () => {
    expect(crumbsFor('/bank-reco').map((c) => c.label)).toEqual(
      ['Accounts', 'Reconciliation', 'Bank Reconciliation'],
    );
    expect(crumbsFor('/accounts/supplier-reco').map((c) => c.label)).toEqual(
      ['Accounts', 'Reconciliation', 'Supplier Reconciliation'],
    );
    expect(crumbsFor('/finance/reco-queue').map((c) => c.label)).toEqual(
      ['Accounts', 'Reconciliation', 'Reconciliation Queue'],
    );
  });
});

describe('Taxation ▸ Reconciliation (GST, India regime)', () => {
  // The divider-based grouping: find the labels that sit between the
  // "Reconciliation" divider and the next divider.
  function itemsUnderDivider(menu, dividerLabel) {
    const kids = menu.children;
    const start = kids.findIndex((c) => c.divider && c.label === dividerLabel);
    if (start < 0) return [];
    const out = [];
    for (let i = start + 1; i < kids.length; i++) {
      if (kids[i].divider) break;
      out.push(kids[i].href);
    }
    return out;
  }

  test('GST recon screens are grouped under a Reconciliation divider', () => {
    expect(itemsUnderDivider(TAX_INDIA, 'Reconciliation')).toEqual(
      expect.arrayContaining(['/tax/gstr2b', '/tax/gstr2a', '/tax/gstr9c']),
    );
  });

  test('GST recon screens are not left duplicated elsewhere in the pill', () => {
    const all = allHrefs(TAX_INDIA);
    ['/tax/gstr2b', '/tax/gstr2a', '/tax/gstr9c'].forEach((h) => {
      expect(all.filter((x) => x === h)).toHaveLength(1);
    });
  });
});
