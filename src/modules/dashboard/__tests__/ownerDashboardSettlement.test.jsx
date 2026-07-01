// Owner Dashboard — the two things the owner asked for after My Dashboard was retired for them:
//   1) AR/AP "Ageing & Settlement" view mirrors the AR report — Unsettled Bills (open) ·
//      On-Account (unapplied receipts/payments) · Actual Balance (net = open − on-account),
//      rendered per branch in Group scope (each in its own currency).
//   2) The financial cockpit shifted over from My Dashboard: Key Alerts (always), Profit
//      Bridge, 13-week Cash Forecast, Consultant Leaderboard — the money panels single-branch
//      only (Group shows a "pick a branch" note; ₹ and $ can't be merged).
const mockNavigate = jest.fn();
jest.mock('../hooks/use-director-dashboard', () => ({ useDirectorDashboard: jest.fn() }));
jest.mock('../hooks/use-dashboard-actions', () => ({ useDashboardActions: () => ({ navigate: mockNavigate }) }));
jest.mock('../store/dashboard.store', () => ({
  useDashboardStore: (sel) => sel({ compareLastYear: false, setCompareLastYear: jest.fn(), pinnedWidgets: {}, togglePinnedWidget: jest.fn() }),
}));

const mockUseAgeing = jest.fn();
jest.mock('../../../core/useAccounting', () => ({
  useModulePL: () => ({ data: {
    modules: [], totals: { sales: 0, gp: 0 }, bridge: { netProfit: 0 },
    byBranch: [
      { branch: 'BOM', totals: { sales: 1000, gp: 300 }, bridge: { netProfit: 250 }, modules: [] },
      { branch: 'NBO', totals: { sales: 500,  gp: 200 }, bridge: { netProfit: 150 }, modules: [] },
    ],
  } }),
  useBalanceSheet: () => ({ data: {} }),
  useAgeing: (...a) => mockUseAgeing(...a),
  useTaxSummary: () => ({ data: {} }),
  useTrialBalance: () => ({ data: {} }),
  useTargetsVsActual: () => ({ data: { totals: { actual: 0, target: 0 } } }),
}));
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: () => 'open' }));
jest.mock('../../../core/period', () => ({ PeriodBar: () => null, periodRange: () => ({ from: '2026-04-01', to: '2026-06-30', label: 'CFY' }) }));
jest.mock('../../../core/styleTokens', () => ({
  bc: (arg) => { const code = typeof arg === 'string' ? arg : arg && arg.code; return { cur: ['NBO', 'DAR', 'FBM'].includes(code) ? '$' : '₹' }; },
}));
jest.mock('../../../core/format', () => ({ compactAmt: (n, opts) => `${(opts && opts.currency) || ''}${Math.round(Number(n) || 0)}` }));
jest.mock('../../../core/styles', () => ({
  KPICard: ({ label, value, onClick }) => <button onClick={onClick}>{`KPI|${label}|${value}`}</button>,
  WidgetCard: ({ title, children, onDrill }) => <div><span>{title}</span>{onDrill && <button onClick={onDrill}>{`drill:${title}`}</button>}{children}</div>,
}));
jest.mock('../../../core/helpers', () => ({ DashboardHeader: ({ title }) => <h1>{title}</h1> }));
jest.mock('../../../shell/PageLayout', () => ({ PageLayout: ({ children }) => <div>{children}</div> }));
jest.mock('../../../shell/primitives', () => ({ ResponsiveGrid: ({ children }) => <div>{children}</div> }));
jest.mock('../../../core/ux/DashboardSkeleton', () => ({ DashboardSkeleton: () => <div>loading…</div> }));
jest.mock('../../../core/ux/DashboardError', () => ({ DashboardError: () => <div>error</div> }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../../../core/ledgerKind', () => ({ isLiquidRow: () => false }));
jest.mock('../components/shared/RevenueTrendChart', () => ({ RevenueTrendChart: () => null }));
jest.mock('../components/shared/FyTargetsPanel', () => ({ FyTargetsPanel: () => null }));
jest.mock('../components/tables/TopEntitiesTable', () => ({ TopEntitiesTable: () => null }));
jest.mock('../components/shared/ConsultantLeaderboard', () => ({ ConsultantLeaderboard: () => <div>LEADER</div> }));
jest.mock('../components/shared/KeyAlertsPanel', () => ({ KeyAlertsPanel: ({ alerts }) => <div>{`ALERTS:${alerts.length}`}</div> }));
jest.mock('../components/shared/PnlWaterfallPanel', () => ({ PnlWaterfallPanel: () => <div>PNL</div> }));
jest.mock('../components/shared/CashForecastPanel', () => ({ CashForecastPanel: () => <div>FORECAST</div> }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useDirectorDashboard } from '../hooks/use-director-dashboard';
import { OwnerDashboardPage } from '../pages/owner-dashboard';

const LOADED = {
  figures: { revenue: 0, gp: 0, gpPct: 0, netProfit: 0, outstanding: 0, payable: 0, cash: 0 },
  pendingBookings: { count: 0, sales: 0, gp: 0 },
  approvedBookings: { count: 0, sales: 0, gp: 0 },
  bookingsByBranch: [],
  revenueTrend: [], topCustomers: [], topSuppliers: [],
  topConsultants: [{ name: 'Ann', gp: 10, rev: 20, cnt: 2 }],
  keyAlerts: [{ title: 'AR 90+ overdue', severity: 'high', type: 'ageing', date: 'today', route: '/dashboards/arap' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  useDirectorDashboard.mockReturnValue({ data: LOADED, totalCashInr: 0, isLoading: false, isError: false, refetch: jest.fn() });
});

describe('Owner Dashboard — single branch (BOM)', () => {
  beforeEach(() => {
    mockUseAgeing.mockReturnValue({ data: {
      receivables: { totals: { d0: 400, d30: 300, d60: 200, d90: 100, total: 1000, onAccount: 240, net: 760 } },
      payables:    { totals: { d0: 0, d30: 0, d60: 0, d90: 0, total: 600, onAccount: 150, net: 450 } },
    } });
  });

  test('AR/AP table shows the settlement view (on-account + actual balance)', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('Receivables / Payables — Ageing & Settlement')).toBeInTheDocument();
    expect(screen.getByText('₹240')).toBeInTheDocument();   // AR on-account (unsettled receipts)
    expect(screen.getByText('₹760')).toBeInTheDocument();   // AR actual balance = 1000 − 240
    expect(screen.getByText('₹450')).toBeInTheDocument();   // AP actual balance = 600 − 150
  });

  test('actual balance is derived (total − onAccount) when net is absent', () => {
    mockUseAgeing.mockReturnValue({ data: {
      receivables: { totals: { d0: 0, d30: 0, d60: 0, d90: 0, total: 900, onAccount: 100 } }, // no net field
      payables:    { totals: { total: 0, onAccount: 0 } },
    } });
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('₹800')).toBeInTheDocument();   // 900 − 100, computed client-side
  });

  test('financial cockpit renders (Key Alerts + Profit Bridge + Cash Forecast + Leaderboard)', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('ALERTS:1')).toBeInTheDocument();
    expect(screen.getByText('PNL')).toBeInTheDocument();
    expect(screen.getByText('FORECAST')).toBeInTheDocument();
    expect(screen.getByText('LEADER')).toBeInTheDocument();
  });
});

describe('Owner Dashboard — Group / ALL', () => {
  beforeEach(() => {
    mockUseAgeing.mockReturnValue({ data: {
      receivables: { totals: {} }, payables: { totals: {} },
      byBranch: [
        { branch: 'BOM', receivables: { totals: { d0: 0, d30: 0, d60: 0, d90: 0, total: 1000, onAccount: 240, net: 760 } }, payables: { totals: { total: 0, onAccount: 0, net: 0 } } },
        { branch: 'NBO', receivables: { totals: { d0: 0, d30: 0, d60: 0, d90: 0, total: 500,  onAccount: 220, net: 280 } }, payables: { totals: { total: 0, onAccount: 0, net: 0 } } },
      ],
    } });
  });

  test('settlement renders per branch, each in its own currency', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText('₹760')).toBeInTheDocument();   // BOM actual balance in ₹
    expect(screen.getByText('$280')).toBeInTheDocument();   // NBO actual balance in $
  });

  test('money cockpit panels collapse to per-branch notes in Group; Key Alerts still shows', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText('ALERTS:1')).toBeInTheDocument();
    expect(screen.getByText(/its profit bridge/)).toBeInTheDocument();
    expect(screen.getByText(/its 13-week cash forecast/)).toBeInTheDocument();
    expect(screen.getByText(/its consultant leaderboard/)).toBeInTheDocument();
    expect(screen.queryByText('PNL')).toBeNull();
  });
});
