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

describe('getVisibleMenu — group-aware nav', () => {
  test('group view (ALL) strips per-branch data-entry items', () => {
    const hrefs = hrefsOf(getVisibleMenu('ALL', { role: 'Super Admin' }));
    // data-entry screens make no sense in the consolidated view → removed
    expect(hrefs).not.toContain('/receipts');
    expect(hrefs).not.toContain('/payments');
    expect(hrefs).not.toContain('/bookings/new');
    // non-entry pages (reports, approvals) still there
    expect(hrefs).toContain('/transactions/approvals');
  });

  test('a real branch keeps data-entry (identical behaviour to getMenu)', () => {
    const hrefs = hrefsOf(getVisibleMenu({ code: 'BOM' }, { role: 'Super Admin' }));
    expect(hrefs).toContain('/receipts');
    expect(hrefs).toContain('/bookings/new');
  });

  test('object-form ALL branch is treated as group mode too', () => {
    const hrefs = hrefsOf(getVisibleMenu({ code: 'ALL' }, { role: 'Super Admin' }));
    expect(hrefs).not.toContain('/receipts');
  });
});
