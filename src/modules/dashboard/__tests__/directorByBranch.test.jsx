// Director Dashboard — Group/ALL view must render money PER BRANCH (own currency), never a
// merged ₹+USD total, and per-branch drills must switch the global branch selector to the
// clicked branch. Locks in the refactor:
//  1) scoreboard: per-branch currency, ranked by GP% (currency-neutral), no Contribution col,
//     sourced from mpl.byBranch (no per-branch useQueries fanout);
//  2) GP-by-Module + Ageing rendered PER BRANCH in Group;
//  3) Revenue Trend / FY Targets / Consultant Leaderboard / Top Customers gated to a
//     "pick a branch" note in Group;
//  4) per-branch drill switches branch then navigates; Top Customers drills to the
//     ranked customer-LTV report (not the alphabetical master).
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
      { branch: 'BOM', totals: { sales: 1000, gp: 300 }, bridge: { netProfit: 250 }, modules: [{ key: 'flt', name: 'Flight', sales: 1000, gp: 300, gpPct: 30 }] },
      { branch: 'NBO', totals: { sales: 500,  gp: 200 }, bridge: { netProfit: 150 }, modules: [{ key: 'flt', name: 'Flight', sales: 500,  gp: 200, gpPct: 40 }] },
    ],
  } }),
  useAgeing: () => ({ data: {
    receivables: { totals: {} }, payables: { totals: {} },
    byBranch: [
      { branch: 'BOM', receivables: { totals: { d0: 0, d30: 0, d60: 0, d90: 0, total: 0 } }, payables: { totals: { total: 0 } } },
      { branch: 'NBO', receivables: { totals: { d0: 0, d30: 0, d60: 0, d90: 0, total: 0 } }, payables: { totals: { total: 0 } } },
    ],
  } }),
  useTargetsVsActual: () => ({ data: { totals: { actual: 0, target: 0 } } }),
}));
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: () => 'open' }));
jest.mock('../../../core/period', () => ({ PeriodBar: () => null, periodRange: () => ({ from: '2026-04-01', to: '2026-06-30', label: 'CFY' }) }));
jest.mock('../../../core/styleTokens', () => ({
  bc: (arg) => { const code = typeof arg === 'string' ? arg : arg && arg.code; return { cur: ['NBO', 'DAR', 'FBM'].includes(code) ? '$' : '₹' }; },
}));
jest.mock('../../../core/format', () => ({ compactAmt: (n, opts) => `${(opts && opts.currency) || ''}${Math.round(Number(n) || 0)}` }));
jest.mock('../../../core/styles', () => ({
  KPICard: ({ label, value, delta, onClick }) => <button onClick={onClick}>{`KPI|${label}|${value}|${delta || ''}`}</button>,
  WidgetCard: ({ title, children, onDrill }) => <div>{title}{onDrill && <button onClick={onDrill}>{`drill:${title}`}</button>}{children}</div>,
}));
jest.mock('../../../core/helpers', () => ({ DashboardHeader: ({ title }) => <h1>{title}</h1> }));
jest.mock('../../../shell/PageLayout', () => ({ PageLayout: ({ children }) => <div>{children}</div> }));
jest.mock('../../../shell/primitives', () => ({ ResponsiveGrid: ({ children }) => <div>{children}</div> }));
jest.mock('../../../core/ux/DashboardSkeleton', () => ({ DashboardSkeleton: () => <div>loading…</div> }));
jest.mock('../../../core/ux/DashboardError', () => ({ DashboardError: () => <div>error</div> }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../components/shared/RevenueTrendChart', () => ({ RevenueTrendChart: () => null }));
jest.mock('../components/shared/FyTargetsPanel', () => ({ FyTargetsPanel: () => null }));
jest.mock('../components/shared/ConsultantLeaderboard', () => ({ ConsultantLeaderboard: () => null }));
jest.mock('../components/tables/TopEntitiesTable', () => ({ TopEntitiesTable: () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDirectorDashboard } from '../hooks/use-director-dashboard';
import { DirectorDashboardPage } from '../pages/director-dashboard';

const LOADED = {
  figures: { revenue: 0, gp: 0, gpPct: 0, netProfit: 0, outstanding: 0, payable: 0 },
  pendingBookings: { count: 0, sales: 0, gp: 0 },
  approvedBookings: { count: 0, sales: 0, gp: 0 },
  bookingsByBranch: [],
  revenueTrend: [], topCustomers: [], topConsultants: [],
};

afterEach(() => jest.clearAllMocks());

describe('Director Dashboard — Group/ALL per-branch wiring', () => {
  beforeEach(() => {
    useDirectorDashboard.mockReturnValue({ data: LOADED, isLoading: false, isError: false, refetch: jest.fn() });
  });

  test('per-branch KPI cards render each branch in its own currency (NBO GP $200, BOM ₹300)', () => {
    render(<DirectorDashboardPage currentUser={{ name: 'Dir' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText('KPI|Gross Profit|$200|40.0% GP')).toBeInTheDocument();   // NBO in USD
    expect(screen.getByText('KPI|Gross Profit|₹300|30.0% GP')).toBeInTheDocument();   // BOM in ₹
  });

  test('per-branch drill switches the global branch selector to the clicked branch, then navigates', () => {
    const setBranch = jest.fn();
    render(<DirectorDashboardPage currentUser={{ name: 'Dir' }} setRoute={jest.fn()} setBranch={setBranch} branch={'ALL'} />);
    fireEvent.click(screen.getByText('KPI|Gross Profit|$200|40.0% GP'));   // NBO GP card
    expect(setBranch).toHaveBeenCalledWith(expect.objectContaining({ code: 'NBO' }));
    expect(mockNavigate).toHaveBeenCalledWith('/reports/gp');
  });

  test('scoreboard drops the cross-currency Contribution column (ranks by GP%)', () => {
    render(<DirectorDashboardPage currentUser={{ name: 'Dir' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText('Branch Performance Scoreboard')).toBeInTheDocument();
    expect(screen.queryByText('Contrib.')).toBeNull();   // cross-currency contribution removed
  });

  test('Group shows per-branch notes for Trend / Targets / Consultant Leaderboard / Top Customers', () => {
    render(<DirectorDashboardPage currentUser={{ name: 'Dir' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText(/12-month revenue trend/)).toBeInTheDocument();
    expect(screen.getByText(/its targets vs actual/)).toBeInTheDocument();
    expect(screen.getByText(/its consultant leaderboard/)).toBeInTheDocument();
    expect(screen.getByText(/its top customers/)).toBeInTheDocument();
  });

  test('GP-by-Module + Ageing render PER BRANCH in Group (own currency)', () => {
    render(<DirectorDashboardPage currentUser={{ name: 'Dir' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getAllByText(/GP & ageing/).length).toBe(2);
    expect(screen.getByText(/· \$ · GP & ageing/)).toBeInTheDocument();   // NBO
    expect(screen.getByText(/· ₹ · GP & ageing/)).toBeInTheDocument();    // BOM
  });

  test('Top Customers drills to the ranked customer-LTV report (not the alphabetical master)', () => {
    render(<DirectorDashboardPage currentUser={{ name: 'Dir' }} setRoute={jest.fn()} branch={'ALL'} />);
    fireEvent.click(screen.getByText('drill:Top 10 Customers'));
    expect(mockNavigate).toHaveBeenCalledWith('/reports/customer-ltv');
    expect(mockNavigate).not.toHaveBeenCalledWith('/masters/customers');
  });
});
