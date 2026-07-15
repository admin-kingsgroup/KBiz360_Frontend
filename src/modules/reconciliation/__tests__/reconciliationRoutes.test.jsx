// Pins the ROUTE-TABLE seam the menu tests and page tests both stop short of:
// (1) every per-tier path the menu links to exists in the route table, and the
// helpers (hubPathFor/certPathFor/reportPathFor) produce exactly those paths;
// (2) each route's Element really renders the TIER + FAMILY its path names — a
// transposed tier or a Hub/Certification mix-up in routes/index.jsx would pass
// every other suite and 404/mis-tier the app.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api', () => ({
  getSummary: jest.fn(() => Promise.resolve({ periods: {}, tiers: {} })),
  getPending: jest.fn(() => Promise.resolve({ rows: [] })),
  getTree: jest.fn(() => Promise.resolve({ groups: [] })),
  getScopeTree: jest.fn(() => Promise.resolve({ groups: [], counts: { total: 0 } })),
  getList: jest.fn(() => Promise.resolve([])),
  getRulebook: jest.fn(() => Promise.resolve({ periods: {} })),
  getCertificate: jest.fn(() => Promise.resolve(null)),
  generateCertificates: jest.fn(), freezeSnapshot: jest.fn(), addAttachment: jest.fn(),
  addException: jest.fn(), resolveException: jest.fn(), signCertificate: jest.fn(), attachScan: jest.fn(),
}));

import { reconciliationRoutes } from '../routes';
import { TIERS, TIER_PATHS, hubPathFor, certPathFor, reportPathFor, tierMenuName, isSoftTier } from '../utils';
import { MENU_RECONCILIATION } from '../../../core/menus';

const routePaths = reconciliationRoutes.map((r) => r.path);
const routeByPath = (p) => reconciliationRoutes.find((r) => r.path === p);
const group = (label) => MENU_RECONCILIATION.children.find((g) => g.label === label);

describe('reconciliation · route table ↔ tier pairing', () => {
  test('hubPathFor/certPathFor/reportPathFor cover every tier and land on real routes', () => {
    TIERS.forEach(({ key }) => {
      expect(routePaths).toContain(hubPathFor(key));
      expect(routePaths).toContain(certPathFor(key));
      expect(routePaths).toContain(reportPathFor(key));
    });
    expect(Object.keys(TIER_PATHS).sort()).toEqual(TIERS.map((t) => t.key).sort());
  });

  test('every menu href under Freeze + Reconciliation Hub + Reports resolves to a route', () => {
    const menuHrefs = [...group('Freeze').children, ...group('Reconciliation Hub').children, ...group('Reports').children]
      .map((c) => c.href);
    menuHrefs.forEach((h) => expect(routePaths).toContain(h));
  });

  test('legacy combined paths still route (old bookmarks land on weekly)', () => {
    expect(routePaths).toContain('/reconciliation');
    expect(routePaths).toContain('/reconciliation/reports');
    expect(routePaths).toContain('/reconciliation/hub');
  });

  const wrap = (ui) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <React.Suspense fallback={<div>loading…</div>}>{ui}</React.Suspense>
      </QueryClientProvider>,
    );
  };

  // Render one of each family through their route Elements END-TO-END — the H1
  // proves the path delivered its own tier AND its own family (Hub vs
  // Certification vs Report), not a transposed one.
  test.each([
    ['/reconciliation/hub/weekly', 'Weekly Reconciliation'],
    ['/reconciliation/hub/monthly', 'Monthly Reconciliation'],
    ['/reconciliation/monthly', 'Monthly Certification'],
    ['/reconciliation/quarterly', 'Quarterly Certification'],
    ['/reconciliation/reports/yearly', 'Yearly Report'],
    ['/reconciliation/reports/weekly', 'Weekly Report'],
  ])('%s renders "%s"', async (path, h1) => {
    const { Element } = routeByPath(path);
    wrap(<Element branch="BOM" setRoute={() => {}} currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText(h1)).toBeInTheDocument();
  });

  test('route titles match the family wording (freeze tiers say Freeze; cert tiers say Certification)', () => {
    TIERS.forEach(({ key }) => {
      expect(routeByPath(hubPathFor(key)).title).toBe(`${tierMenuName(key)} Reconciliation`);
      expect(routeByPath(reportPathFor(key)).title).toBe(`${tierMenuName(key)} Report`);
      expect(routeByPath(certPathFor(key)).title).toBe(`${tierMenuName(key)} ${isSoftTier(key) ? 'Freeze' : 'Certification'}`);
    });
  });
});
