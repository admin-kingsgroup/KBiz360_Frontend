// The Owner Dashboard (consolidated all-branch) link is owner-only: it appears in
// the Dashboards dropdown ONLY for afshin.dhanani@kingsgroupco.com (by email), and
// the route itself is email-gated in App.jsx. No role (not even Super Admin) grants
// it to anyone else.
import { getMenu } from '../menus';

const OWNER = { role: 'Super Admin', email: 'afshin.dhanani@kingsgroupco.com' };
const OTHER_ADMIN = { role: 'Super Admin', email: 'someone.else@kingsgroupco.com' };
// Owner email but NOT a Super Admin → must not see it (both conditions required).
const OWNER_EMAIL_WRONG_ROLE = { role: 'Director', email: 'afshin.dhanani@kingsgroupco.com' };

// Collect every href in a (possibly nested) menu tree.
function hrefs(nodes, acc = []) {
  (nodes || []).forEach((n) => {
    if (n.href) acc.push(n.href);
    if (n.children) hrefs(n.children, acc);
  });
  return acc;
}

describe('Owner Dashboard menu link — owner email only', () => {
  test('the owner sees the /dashboard/owner link, which REPLACES My Dashboard', () => {
    const all = hrefs(getMenu('ALL', OWNER));
    expect(all).toContain('/dashboard/owner');
    expect(all).not.toContain('/dashboard'); // My Dashboard retired for the owner (its widgets moved to the Owner Dashboard)
  });

  test('another Super Admin (different email) does NOT see it', () => {
    const all = hrefs(getMenu('ALL', OTHER_ADMIN));
    expect(all).not.toContain('/dashboard/owner');
    expect(all).toContain('/dashboard');
  });

  test('the owner email under a non-Super-Admin role does NOT see it (role required)', () => {
    const all = hrefs(getMenu('ALL', OWNER_EMAIL_WRONG_ROLE));
    expect(all).not.toContain('/dashboard/owner');
  });
});
