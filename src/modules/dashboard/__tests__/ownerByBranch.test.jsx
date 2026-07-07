// Owner Dashboard — Group/ALL view must render money PER BRANCH in each branch's own
// currency, never a merged ₹+USD total. This locks in two fixes:
//  1) the per-branch "GST / Tax Net" card now reads tax.byBranch[].netPayable (was always
//     0 because taxSummary didn't return byBranch);
//  2) the financial-detail tables (GP-by-Module / Balance Sheet / AR-AP / Cash & Bank) are
//     rendered once PER BRANCH from each branch's byBranch slice, with its own-currency
//     formatter (no auto-FX).
//
// Heavy children/layout are stubbed; KPICard/WidgetCard render their text so we can assert.
const mockNavigate = jest.fn();
jest.mock('../hooks/use-director-dashboard', () => ({ useDirectorDashboard: jest.fn() }));
jest.mock('../hooks/use-dashboard-actions', () => ({ useDashboardActions: () => ({ navigate: mockNavigate }) }));
jest.mock('../store/dashboard.store', () => ({
  useDashboardStore: (sel) => sel({ compareLastYear: false, setCompareLastYear: jest.fn(), pinnedWidgets: [], togglePinnedWidget: jest.fn() }),
}));
jest.mock('../../../core/useAccounting', () => ({
  useModulePL: () => ({ data: {
    modules: [],
    byBranch: [
      { branch: 'BOM', totals: { sales: 1000, gp: 400 }, bridge: { netProfit: 300 }, modules: [{ key: 'flt', name: 'Flight', sales: 1000, gp: 400, gpPct: 40 }] },
      { branch: 'NBO', totals: { sales: 500,  gp: 200 }, bridge: { netProfit: 150 }, modules: [{ key: 'flt', name: 'Flight', sales: 500,  gp: 200, gpPct: 40 }] },
    ],
  } }),
  useBalanceSheet: () => ({ data: {
    assets: [], liabilities: [],
    byBranch: [
      { branch: 'BOM', assets: [{ group: 'Bank', amount: 700 }], liabilities: [{ group: 'Capital', amount: 700 }] },
      { branch: 'NBO', assets: [{ group: 'Bank', amount: 300 }], liabilities: [{ group: 'Capital', amount: 300 }] },
    ],
  } }),
  useAgeing: () => ({ data: {
    receivables: { totals: {} }, payables: { totals: {} },
    byBranch: [
      { branch: 'BOM', receivables: { totals: { d0: 0, d30: 0, d60: 0, d90: 0, total: 0 } }, payables: { totals: { total: 0 } } },
      { branch: 'NBO', receivables: { totals: { d0: 0, d30: 0, d60: 0, d90: 0, total: 0 } }, payables: { totals: { total: 0 } } },
    ],
  } }),
  useTaxSummary: () => ({ data: {
    netPayable: 130,
    byBranch: [{ branch: 'BOM', netPayable: 80 }, { branch: 'NBO', netPayable: 50 }],
  } }),
  useTrialBalance: () => ({ data: {
    rows: [],
    byBranch: [
      { branch: 'BOM', rows: [{ ledger: 'HDFC', group: 'Bank', closingDebit: 700, closingCredit: 0 }] },
      { branch: 'NBO', rows: [{ ledger: 'KCB',  group: 'Bank', closingDebit: 300, closingCredit: 0 }] },
    ],
  } }),
  useTargetsVsActual: () => ({ data: { totals: { actual: 0, target: 0 } } }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQueries: () => new Proxy([], { get: (t, p) => (p in t || typeof p === 'symbol' ? t[p] : { data: {} }) }),
}));
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: () => 'open' }));
jest.mock('../../../core/period', () => ({
  PeriodBar: () => null,
  periodRange: () => ({ from: '2026-04-01', to: '2026-06-30', label: 'CFY' }),
}));
// USD for the African branches, ₹ otherwise (incl. the 'ALL' group selector).
jest.mock('../../../core/styleTokens', () => ({
  bc: (arg) => { const code = typeof arg === 'string' ? arg : arg && arg.code; return { cur: ['NBO', 'DAR', 'FBM'].includes(code) ? '$' : '₹' }; },
}));
// Deterministic money so we can assert exact strings: "<symbol><rounded>".
jest.mock('../../../core/format', () => ({ compactAmt: (n, opts) => `${(opts && opts.currency) || ''}${Math.round(Number(n) || 0)}`, localeOf: () => 'en-IN' }));
jest.mock('../../../core/ledgerKind', () => ({ isLiquidRow: () => true }));
jest.mock('../../../core/styles', () => ({
  KPICard: ({ label, value, delta, onClick }) => <button onClick={onClick}>{`KPI|${label}|${value}|${delta || ''}`}</button>,
  WidgetCard: ({ title, children }) => <div>{title}{children}</div>,
}));
jest.mock('../../../core/helpers', () => ({ DashboardHeader: ({ title }) => <h1>{title}</h1> }));
jest.mock('../../../shell/PageLayout', () => ({ PageLayout: ({ children }) => <div>{children}</div> }));
jest.mock('../../../shell/primitives', () => ({ ResponsiveGrid: ({ children }) => <div>{children}</div> }));
jest.mock('../../../core/ux/DashboardSkeleton', () => ({ DashboardSkeleton: () => <div>loading…</div> }));
jest.mock('../../../core/ux/DashboardError', () => ({ DashboardError: () => <div>error</div> }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../components/shared/RevenueTrendChart', () => ({ RevenueTrendChart: () => null }));
jest.mock('../components/shared/FyTargetsPanel', () => ({ FyTargetsPanel: () => null }));
jest.mock('../components/tables/TopEntitiesTable', () => ({ TopEntitiesTable: () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDirectorDashboard } from '../hooks/use-director-dashboard';
import { OwnerDashboardPage } from '../pages/owner-dashboard';

const LOADED = {
  figures: { revenue: 0, gp: 0, gpPct: 0, netProfit: 0, outstanding: 0, payable: 0, cash: 0 },
  pendingBookings: { count: 0, sales: 0, gp: 0 },
  approvedBookings: { count: 0, sales: 0, gp: 0 },
  bookingsByBranch: [],
  revenueTrend: [], topCustomers: [], topSuppliers: [],
};

afterEach(() => jest.clearAllMocks());

describe('Owner Dashboard — Group/ALL per-branch wiring', () => {
  beforeEach(() => {
    useDirectorDashboard.mockReturnValue({ data: LOADED, totalCashInr: 0, isLoading: false, isError: false, refetch: jest.fn() });
  });

  test('per-branch GST / Tax Net card reads tax.byBranch (NBO = $50, not $0)', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    // NBO netPayable 50 in USD → "$50" (only the GST card produces this). Before the fix
    // tax.byBranch was undefined so every per-branch GST card showed "$0"/"₹0".
    expect(screen.getByText('KPI|GST / Tax Net|$50|payable')).toBeInTheDocument();
    // BOM (₹) GST card = ₹80.
    expect(screen.getByText('KPI|GST / Tax Net|₹80|payable')).toBeInTheDocument();
  });

  test('financial-detail tables render once PER BRANCH (all six, side by side), each in its own currency', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    // One "financial detail" section header per branch — every branch in the roster shows,
    // not only the ones with postings (BOMMB/BOM/AMD in ₹, NBO/DAR/FBM in $).
    expect(screen.getAllByText(/financial detail/).length).toBe(6);
    expect(screen.getAllByText(/· \$ · financial detail/).length).toBe(3);   // NBO/DAR/FBM in USD
    expect(screen.getAllByText(/· ₹ · financial detail/).length).toBe(3);    // BOMMB/BOM/AMD in ₹
  });

  test('GST / Tax Net card drills to the live tax-summary report (not the dead /taxation route)', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    fireEvent.click(screen.getByText('KPI|GST / Tax Net|$50|payable'));   // NBO branch GST card
    expect(mockNavigate).toHaveBeenCalledWith('/reports/tax-summary');
    expect(mockNavigate).not.toHaveBeenCalledWith('/taxation');
  });

  test('#1 per-branch drill switches the global branch selector to the clicked branch, then navigates', () => {
    const setBranch = jest.fn();
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} setBranch={setBranch} branch={'ALL'} />);
    fireEvent.click(screen.getByText('KPI|GST / Tax Net|$50|payable'));   // NBO card
    // The selector is set to the NBO branch object BEFORE navigating, so the destination
    // report opens scoped to NBO (not the consolidated all-branch view).
    expect(setBranch).toHaveBeenCalledWith(expect.objectContaining({ code: 'NBO' }));
    expect(mockNavigate).toHaveBeenCalledWith('/reports/tax-summary');
  });

  test('#2 Group view shows per-branch notes (no cross-currency merge) for Trend / Targets / Top Customers+Suppliers', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText(/12-month revenue trend/)).toBeInTheDocument();
    expect(screen.getByText(/its targets vs actual/)).toBeInTheDocument();
    expect(screen.getByText(/its top customers/)).toBeInTheDocument();
    expect(screen.getByText(/its top suppliers/)).toBeInTheDocument();
  });

  test('#3 Branch Performance lists ALL six branches side by side (zeros where no data)', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    // Every branch shows — data-bearing (BOM, NBO) and mid-migration (AMD, DAR, …) alike,
    // so the group view never silently drops a branch with no postings this period.
    expect(screen.getByText('Branch Performance')).toBeInTheDocument();
    expect(screen.getAllByText('BOM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AMD').length).toBeGreaterThan(0);  // no postings → still listed
    expect(screen.getAllByText('DAR').length).toBeGreaterThan(0);  // USD branch, zero-row
  });
});
