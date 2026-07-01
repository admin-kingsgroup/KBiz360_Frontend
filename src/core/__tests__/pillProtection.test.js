// Top-level pills are protected from the per-user `hidden` deny-list: hiding a page
// may drop a pill's INNER sub-page, but never the pill itself (chosen product rule).
// A single-page pill like Approvals therefore always survives.
import { getMenu } from '../menus';

const topLabels = (menu) => menu.map((m) => m.label);
const allHrefs = (menu) => {
  const out = [];
  const walk = (n) => { if (!n) return; if (n.href) out.push(n.href); (n.children || []).forEach(walk); };
  menu.forEach(walk);
  return out;
};

describe('top-level pill protection in getMenu()', () => {
  test('hiding a single-page pill (Approvals) keeps the pill for an accountant', () => {
    const acct = { role: 'Branch Accountant', hidden: ['/transactions/approvals'] };
    expect(topLabels(getMenu('ALL', acct))).toContain('Approvals');
  });

  test('hiding a single-page pill keeps it for a full-menu user too', () => {
    const admin = { role: 'Super Admin', email: 'x@y.com', hidden: ['/transactions/approvals'] };
    expect(topLabels(getMenu('ALL', admin))).toContain('Approvals');
  });

  test('hiding an INNER sub-page removes only that page, and its pill stays', () => {
    const admin = { role: 'Super Admin', email: 'x@y.com' };
    const full = getMenu('ALL', admin);
    const inner = '/masters/customers'; // a normal inner page under the Masters pill
    expect(allHrefs(full)).toContain(inner);               // sanity: it's there to begin with
    const after = getMenu('ALL', { ...admin, hidden: [inner] });
    expect(allHrefs(after)).not.toContain(inner);          // the page is gone
    expect(topLabels(after)).toEqual(topLabels(full));      // every pill still present
  });
});
