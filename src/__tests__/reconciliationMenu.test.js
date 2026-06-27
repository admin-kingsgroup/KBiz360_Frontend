// Verifies the dedicated "Reconciliation" head under Accounts: it consolidates
// every reconciliation screen, split into Client · Bank · Supplier · Tax sections,
// that the moved items aren't duplicated in their old groups, that breadcrumbs
// point at the new location, that the GST recon screens are also grouped under a
// "Reconciliation" divider in the Taxation pill, and that the Accounts-side Tax
// pointer is regime-aware (India keeps GST links; pure VAT branches don't).
import { MENU_ACCOUNTS, getMenu } from '../core/menus';
import { TAX_INDIA } from '../core/data';
import { crumbsFor } from '../core/routeMeta';

const groupByLabel = (menu, label) => menu.children.find((c) => c.label === label);
const hrefs = (group) => (group?.children || []).map((c) => c.href).filter(Boolean);

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

  test('it contains client, bank, supplier and queue reconciliation', () => {
    expect(hrefs(recon)).toEqual(
      expect.arrayContaining(['/accounts/client-reco', '/bank-reco', '/accounts/supplier-reco', '/finance/reco-queue']),
    );
  });

  test('it is split into Client / Bank / Supplier sections (dividers)', () => {
    const dividers = recon.children.filter((c) => c.divider).map((c) => c.label);
    expect(dividers).toEqual(expect.arrayContaining(['Client', 'Bank', 'Supplier']));
  });

  test('no tax/GST reconciliation links remain under the Accounts pill', () => {
    const all = allHrefs(MENU_ACCOUNTS);
    ['/tax/reconciliation', '/tax/gstr2b', '/tax/gstr2a', '/tax/gstr9c'].forEach((h) => {
      expect(all).not.toContain(h);
    });
  });

  test('moved items are not duplicated in their old groups', () => {
    expect(hrefs(groupByLabel(MENU_ACCOUNTS, 'Cash & Bank'))).not.toContain('/bank-reco');
    expect(hrefs(groupByLabel(MENU_ACCOUNTS, 'Cash & Bank'))).not.toContain('/finance/reco-queue');
    expect(hrefs(groupByLabel(MENU_ACCOUNTS, 'Payables & Suppliers'))).not.toContain('/accounts/supplier-reco');
  });

  test('each non-tax recon route appears exactly once in the Accounts pill', () => {
    const all = allHrefs(MENU_ACCOUNTS);
    ['/accounts/client-reco', '/bank-reco', '/accounts/supplier-reco', '/finance/reco-queue'].forEach((h) => {
      expect(all.filter((x) => x === h)).toHaveLength(1);
    });
  });

  test('breadcrumbs resolve to Accounts › Reconciliation › <leaf>', () => {
    expect(crumbsFor('/accounts/client-reco').map((c) => c.label)).toEqual(
      ['Accounts', 'Reconciliation', 'Client Reconciliation'],
    );
    expect(crumbsFor('/bank-reco').map((c) => c.label)).toEqual(
      ['Accounts', 'Reconciliation', 'Bank Reconciliation'],
    );
    expect(crumbsFor('/accounts/supplier-reco').map((c) => c.label)).toEqual(
      ['Accounts', 'Reconciliation', 'Supplier Reconciliation'],
    );
  });
});

describe('Accounts ▸ Reconciliation carries NO tax links in any regime (getMenu)', () => {
  const accountsRecon = (branch) => {
    const menu = getMenu(branch, { role: 'Super Admin' });
    const accounts = menu.find((m) => m.label === 'Accounts');
    return hrefs(groupByLabel(accounts, 'Reconciliation'));
  };
  const GST = ['/tax/gstr2b', '/tax/gstr2a', '/tax/gstr9c', '/tax/reconciliation'];

  test.each([
    ['India branch (BOM)', { code: 'BOM' }],
    ['consolidated ("ALL")', 'ALL'],
    ['pure VAT branch (NBO)', { code: 'NBO' }],
  ])('%s shows only non-tax recons under Accounts', (_name, branch) => {
    const h = accountsRecon(branch);
    GST.forEach((g) => expect(h).not.toContain(g));
    // the non-tax recons are still there
    expect(h).toEqual(expect.arrayContaining(['/accounts/client-reco', '/bank-reco', '/accounts/supplier-reco']));
  });
});

describe('Taxation ▸ Reconciliation (GST, India regime)', () => {
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
});
