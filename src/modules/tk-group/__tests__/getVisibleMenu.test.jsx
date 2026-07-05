import { getVisibleMenu } from '../menu';

// Collect every leaf href in a menu tree.
const hrefsOf = (nodes, out = []) => {
  (nodes || []).forEach((n) => {
    if (!n || n.divider) return;
    if (n.href) out.push(n.href);
    if (n.children) hrefsOf(n.children, out);
  });
  return out;
};

describe('getVisibleMenu — TK Group Central vs branch', () => {
  test('TK Group Central (ALL + central) shows the control cockpit, not the branch ERP', () => {
    const hrefs = hrefsOf(getVisibleMenu('ALL', { role: 'Super Admin' }));
    expect(hrefs).toContain('/tk/control-tower');           // the cockpit is the nav
    expect(hrefs).not.toContain('/receipts');               // book-less: no data-entry
    expect(hrefs).not.toContain('/transactions/approvals'); // no branch ERP
    expect(hrefs).not.toContain('/reports/pnl');
  });

  test('a real branch shows the branch ERP with data-entry, not the cockpit', () => {
    const hrefs = hrefsOf(getVisibleMenu({ code: 'BOM' }, { role: 'Super Admin' }));
    expect(hrefs).toContain('/receipts');
    expect(hrefs).toContain('/bookings/new');
    expect(hrefs).not.toContain('/tk/control-tower');       // control is group-level only
  });

  test('object-form ALL is TK Group Central too (cockpit)', () => {
    const hrefs = hrefsOf(getVisibleMenu({ code: 'ALL' }, { role: 'Super Admin' }));
    expect(hrefs).toContain('/tk/control-tower');
    expect(hrefs).not.toContain('/receipts');
  });
});
