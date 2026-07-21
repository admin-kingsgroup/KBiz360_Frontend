/* Verifies the "Tax & Statutory" group was moved OUT of the Accounts pill and
   INTO the Taxation header, with no duplication. */
import { MENU_ACCOUNTS, getMenu } from '../core/menus';
import { TAX_INDIA, TAX_AFRICA, TAX_ALL } from '../core/data';

const TAX_HREFS = [
  '/reports/tax-summary',
  '/finance/tds-calculator',
  '/reports/statutory-dues',
  '/reports/tax-board',
];
// The India TDS Auto-Calculator (Sections 194 / PAN / Challan 281, ₹) is intentionally
// NOT in the Africa VAT pill — wrong regime for a VAT branch (same reason "Withholding
// Tax" was dropped). Everything else appears in all three pills.
const AFRICA_TAX_HREFS = TAX_HREFS.filter((h) => h !== '/finance/tds-calculator');

// Flatten a menu node tree into the list of every href it contains.
function hrefs(node, acc = []) {
  if (!node) return acc;
  if (node.href) acc.push(node.href);
  (node.children || []).forEach(c => hrefs(c, acc));
  return acc;
}

describe('Tax & Statutory → Taxation header', () => {
  test('removed from the Accounts pill', () => {
    const labels = (MENU_ACCOUNTS.children || []).map(c => c.label);
    expect(labels).not.toContain('Tax & Statutory');
    const accountsHrefs = hrefs(MENU_ACCOUNTS);
    TAX_HREFS.forEach(h => expect(accountsHrefs).not.toContain(h));
  });

  test.each([
    ['TAX_INDIA', TAX_INDIA, TAX_HREFS],
    ['TAX_AFRICA', TAX_AFRICA, AFRICA_TAX_HREFS],
    ['TAX_ALL', TAX_ALL, TAX_HREFS],
  ])('present in %s without duplication', (_name, menu, expected) => {
    const list = hrefs(menu);
    expected.forEach(h => {
      expect(list).toContain(h);
      // each tax href appears exactly once (no duplicate menu entry)
      expect(list.filter(x => x === h)).toHaveLength(1);
    });
  });

  test('India TDS Auto-Calculator is NOT in the Africa VAT pill (wrong regime)', () => {
    expect(hrefs(TAX_AFRICA)).not.toContain('/finance/tds-calculator');
  });

  test('Branch Accountant keeps Accounts but NOT the Taxation pill (removed 2026-07-17)', () => {
    // Taxation is central-finance work — the pill left the accountant surface
    // entirely (see core/menus.js roleMenuRoots); full-menu roles still get it,
    // which the test.each above already covers via the TAX_* pill contents.
    const user = { role: 'Branch Accountant' };
    const menu = getMenu({ code: 'BOM' }, user); // Indian branch → GST regime
    const labels = menu.map(m => m.label);
    expect(labels).toContain('Accounts');
    expect(labels).not.toContain('Taxation — GST');
    const allHrefs = menu.flatMap(m => hrefs(m));
    TAX_HREFS.forEach(h => expect(allHrefs).not.toContain(h));
  });
});
