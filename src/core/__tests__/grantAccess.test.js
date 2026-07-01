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

  test('granting does not leak the accountant into unrelated pills', () => {
    const after = getMenu('ALL', acct({ granted: ['/hr/employees'] }));
    // only Accounts/Approvals/Taxation/Support (role) + HR (granted) — no Masters/Reports/Admin
    expect(labels(after)).not.toContain('Masters');
    expect(labels(after)).not.toContain('Admin');
  });
});
