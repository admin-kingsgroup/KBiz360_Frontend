import { MENU_ACCOUNTS, MENU_FINANCE } from '../menus';

// The 4 items moved from Accounts ▸ Sales & Purchase to Finance ▸ Registers & Outstanding.
const MOVED = [
  { label: 'Module Sales Register',     href: '/finance/module-sales-register' },
  { label: 'Module Purchase Register',  href: '/finance/module-purchase-register' },
  { label: 'Invoice-wise GP (Link No)', href: '/reports/invoice-gp' },
  { label: 'Sales & GP Analytics',      href: '/reports/sales-gp-analytics' },
];

function leaves(node, out = []) {
  if (!node) return out;
  if (node.href) out.push({ label: node.label, href: node.href });
  (node.children || []).forEach(c => leaves(c, out));
  return out;
}

describe('Module registers moved from Accounts to Finance', () => {
  const accountsHrefs = new Set(leaves(MENU_ACCOUNTS).map(l => l.href));
  const financeLeaves = leaves(MENU_FINANCE);
  const financeHrefs = new Set(financeLeaves.map(l => l.href));

  it('removes all 4 items from the Accounts pill', () => {
    MOVED.forEach(m => {
      expect(accountsHrefs.has(m.href)).toBe(false);
    });
  });

  it('adds all 4 items to the Finance pill', () => {
    MOVED.forEach(m => {
      expect(financeHrefs.has(m.href)).toBe(true);
    });
  });

  it('places them under Finance ▸ Registers & Outstanding', () => {
    const section = MENU_FINANCE.children.find(c => c.label === 'Registers & Outstanding');
    const sectionHrefs = new Set((section?.children || []).map(c => c.href));
    MOVED.forEach(m => expect(sectionHrefs.has(m.href)).toBe(true));
  });

  it('keeps Sales Register and Purchase Register in Accounts', () => {
    expect(accountsHrefs.has('/reports/sreg')).toBe(true);
    expect(accountsHrefs.has('/reports/preg')).toBe(true);
  });
});
