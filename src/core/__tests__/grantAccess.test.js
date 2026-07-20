// Per-user GRANT (allow-list): turning an out-of-role page ON for a user shows it in
// their nav and lets them open it by direct URL (overriding the role route-lockout).
// Effective visibility = (role pages ∪ granted) − hidden.
import { getMenu, canReachRoute } from '../menus';

const hrefs = (menu) => {
  const out = [];
  const walk = (n) => { if (!n) return; if (n.href) out.push(n.href); (n.children || []).forEach(walk); };
  menu.forEach(walk);
  return out;
};
const labels = (menu) => menu.map((m) => m.label);
const acct = (extra = {}) => ({ role: 'Branch Accountant', ...extra });

describe('per-user grant (allow-list)', () => {
  test('granting an out-of-role page adds it (and its pill) to the accountant nav', () => {
    const before = getMenu('ALL', acct());
    expect(hrefs(before)).not.toContain('/hr/employees'); // out of role by default
    expect(labels(before)).not.toContain('HR');
    const after = getMenu('ALL', acct({ granted: ['/hr/employees'] }));
    expect(hrefs(after)).toContain('/hr/employees');       // page now visible
    expect(labels(after)).toContain('HR');                 // its pill appears
  });

  test('a granted route overrides the role route-lockout', () => {
    expect(canReachRoute('/hr/employees', acct())).toBe(false);                          // normally locked
    expect(canReachRoute('/hr/employees', acct({ granted: ['/hr/employees'] }))).toBe(true); // granted
  });

  test('granting is a no-op for full-menu users (already see everything)', () => {
    const admin = { role: 'Super Admin', email: 'x@y.com', granted: ['/hr/employees'] };
    expect(canReachRoute('/hr/employees', admin)).toBe(true);
    expect(hrefs(getMenu('ALL', admin))).toContain('/hr/employees');
  });

  test('a page both granted and hidden stays hidden (hidden wins)', () => {
    const after = getMenu('ALL', acct({ granted: ['/hr/employees'], hidden: ['/hr/employees'] }));
    expect(hrefs(after)).not.toContain('/hr/employees');
  });

  test('the accountant Accounts pill drops the central-finance heads', () => {
    const menu = getMenu('ALL', acct());
    const accounts = menu.find((m) => m.label === 'Accounts');
    const heads = (accounts?.children || []).map((c) => c.label);
    for (const gone of ['Branch MIS', 'Inter Branch', 'Period Close', 'Currency & Planning']) {
      expect(heads).not.toContain(gone);
    }
    expect(heads).toContain('Daily Entry'); // the workspace itself is intact
    expect(heads).toContain('Books & Scrutiny');
  });

  test('granting does not leak the accountant into unrelated pills', () => {
    const after = getMenu('ALL', acct({ granted: ['/hr/employees'] }));
    // only Accounts/Approvals/Support (role) + HR (granted) — no Masters/Reports/Admin/Taxation
    expect(labels(after)).not.toContain('Masters');
    expect(labels(after)).not.toContain('Admin');
    expect(labels(after)).not.toContain('Taxation'); // removed from the accountant surface
  });
});
