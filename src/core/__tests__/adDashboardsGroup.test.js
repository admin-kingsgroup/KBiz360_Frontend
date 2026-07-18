// The "AD Dashboards" group (formerly "Overview": My Dashboard / Alerts / Capital vs
// Investment) is Super-Admin-only. Directors keep the rest of the Dashboards dropdown
// (Financials / Business / Targets / Control) but not the AD Dashboards group.
import { getMenu } from '../menus';

const SUPER_ADMIN = { role: 'Super Admin', email: 'someone@kingsgroupco.com' };
const DIRECTOR = { role: 'Director', email: 'dir@kingsgroupco.com' };

// The Dashboards pill for a full-menu role.
function dashboardsPill(user) {
  return getMenu('ALL', user).find((m) => m && m.label === 'Dashboards');
}
const groupLabels = (pill) => (pill?.children || []).map((c) => c.label);

describe('AD Dashboards group — Super-Admin only', () => {
  test('renamed: no group is labelled "Overview" any more', () => {
    expect(groupLabels(dashboardsPill(SUPER_ADMIN))).not.toContain('Overview');
  });

  test('Super Admin sees the AD Dashboards group with its links', () => {
    const pill = dashboardsPill(SUPER_ADMIN);
    expect(groupLabels(pill)).toContain('AD Dashboards');
    const ad = pill.children.find((c) => c.label === 'AD Dashboards');
    const hrefs = ad.children.map((c) => c.href);
    // Alerts folded into the "Governance & Exceptions" board (Control group) as a tab, so it's
    // no longer a direct AD Dashboards link. The group keeps My Dashboard / Capital / TGT.
    expect(hrefs).toEqual(expect.arrayContaining(['/dashboard', '/dashboards/capital', '/dashboards/performance']));
    expect(hrefs).not.toContain('/dashboard/alerts');
  });

  test('Director does NOT see the AD Dashboards group, but keeps the rest of the dropdown', () => {
    const pill = dashboardsPill(DIRECTOR);
    expect(pill).toBeTruthy(); // Dashboards pill still shown to Director
    const labels = groupLabels(pill);
    expect(labels).not.toContain('AD Dashboards');
    expect(labels).toContain('Financials');
    expect(labels).toContain('Business');
  });
});
