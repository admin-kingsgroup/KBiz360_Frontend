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

  test('Focus on a branch adds its full Accounts pill (still the cockpit)', () => {
    const menu = getVisibleMenu('ALL', { role: 'Super Admin' }, 'BOM');
    const hrefs = hrefsOf(menu);
    expect(hrefs).toContain('/tk/control-tower');   // still the cockpit
    // The workspace is the SAME "Accounts" pill the branch surface carries, relabelled.
    expect(menu.some((p) => p && p.label === 'Accounts — BOM')).toBe(true);
    expect(hrefs).toContain('/receipts');            // Data Entry now reachable (operates on BOM)
    expect(hrefs).toContain('/bookings/new');        // SO/PO/GP
    expect(hrefs).toContain('/bookings/inter-branch'); // INB
    expect(hrefs).toContain('/finance/refund');      // full entry parity (refund/reissue/ADM)
    expect(hrefs).toContain('/reports/pnl');         // full Reports (Branch MIS)
    expect(hrefs).toContain('/reports/sreg');        // registers
    expect(hrefs).toContain('/finance/trial-balance'); // Books & Scrutiny
    // Masters stay central (Masters & Ledger pill), not duplicated inside Accounts.
    const accounts = menu.find((p) => p && p.label === 'Accounts — BOM');
    expect((accounts.children || []).some((c) => c && c.label === 'Accounts Master')).toBe(false);
  });

  test('Focus = ALL (branchwise) does NOT show the branch workspace (book-less)', () => {
    const hrefs = hrefsOf(getVisibleMenu('ALL', { role: 'Super Admin' }, 'ALL'));
    expect(hrefs).toContain('/tk/control-tower');
    expect(hrefs).not.toContain('/receipts');
    expect(hrefs).not.toContain('/reports/pnl');
  });

  test('a non-central role never gets the cockpit workspace even with a focus value', () => {
    const hrefs = hrefsOf(getVisibleMenu('ALL', { role: 'Branch Accountant' }, 'BOM'));
    expect(hrefs).not.toContain('/tk/control-tower');
  });

  test('cockpit has the two approvals + a role-segregated Dashboards section', () => {
    const hrefs = hrefsOf(getVisibleMenu('ALL', { role: 'Super Admin' }));
    expect(hrefs).toContain('/tk/voucher-approvals');            // Approvals — Vouchers (data entry)
    expect(hrefs).toContain('/tk/approvals');                    // Admin Approval (everything else)
    expect(hrefs.some((h) => h.startsWith('/dashboard'))).toBe(true); // Dashboards group present
  });

  test('Administration lives in the cockpit (Owner) and is stripped from the branch nav', () => {
    const owner = hrefsOf(getVisibleMenu('ALL', { role: 'Super Admin' }));
    expect(owner).toContain('/settings/users');            // Administration ▸ Users & Roles
    expect(owner).toContain('/settings/permissions-matrix'); // ▸ Permissions
    expect(owner).toContain('/settings/branches');         // ▸ Org config
    const branch = hrefsOf(getVisibleMenu({ code: 'BOM' }, { role: 'Super Admin' }));
    expect(branch).not.toContain('/settings/users');       // org-admin OFF the branch surface
    expect(branch).not.toContain('/settings/permissions-matrix');
  });

  test('a non-Owner central role sees Administration but NOT user creation (Owner-gated)', () => {
    const fm = hrefsOf(getVisibleMenu('ALL', { role: 'Senior Finance Manager' }));
    expect(fm).toContain('/settings/branches');            // org-config visible to central roles
    expect(fm).not.toContain('/settings/users');           // user creation is Owner-only
    expect(fm).not.toContain('/settings/permissions-matrix');
  });
});
