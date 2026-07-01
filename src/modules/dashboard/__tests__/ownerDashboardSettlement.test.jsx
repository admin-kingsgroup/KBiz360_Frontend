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
import { render, screen, fireEvent } from '@testing-library/react';
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
      receivables: {
        totals: { d0: 400, d30: 300, d60: 200, d90: 100, a7: 400, a15: 300, a30: 100, a45: 0, a60: 0, a61: 200, billed: 1500, settled: 740, total: 1000, onAccount: 240, net: 760 },
        rows: [{ party: 'Global', a7: 400, a15: 300, a30: 100, a45: 0, a60: 0, a61: 200, total: 1000, onAccount: 240, net: 760 }],
      },
      payables: {
        totals: { d0: 0, d30: 0, d60: 0, d90: 600, a7: 0, a15: 0, a30: 0, a45: 0, a60: 0, a61: 600, billed: 900, settled: 300, total: 600, onAccount: 150, net: 450 },
        rows: [{ party: 'TripJack', a7: 0, a15: 0, a30: 0, a45: 0, a60: 0, a61: 600, total: 600, onAccount: 150, net: 450 }],
      },
    } });
  });

  test('renders two separate settlement cards (Receivables + Payables) with the six-metric tabs', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('Receivables — Ageing & Settlement')).toBeInTheDocument();
    expect(screen.getByText('Payables — Ageing & Settlement')).toBeInTheDocument();
    expect(screen.getByText('₹1500')).toBeInTheDocument();              // AR Total Bills (billed) — unique
    expect(screen.getAllByText('₹240').length).toBeGreaterThan(0);      // AR Unsettled Receipt (tile + grid + footer)
    expect(screen.getAllByText('₹760').length).toBeGreaterThan(0);      // AR Final Receivables (net)
    expect(screen.getAllByText('₹450').length).toBeGreaterThan(0);      // AP Final Payables (net)
  });

  test('Final Receivables is derived (total − onAccount) when net is absent', () => {
    mockUseAgeing.mockReturnValue({ data: {
      receivables: {
        totals: { a7: 900, a15: 0, a30: 0, a45: 0, a60: 0, a61: 0, billed: 900, settled: 100, total: 900, onAccount: 100 }, // no net field
        rows: [{ party: 'Acme', a7: 900, a15: 0, a30: 0, a45: 0, a60: 0, a61: 0, total: 900, onAccount: 100 }], // row net absent too → derived
      },
      payables: { totals: { total: 0, onAccount: 0 }, rows: [] },
    } });
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getAllByText('₹800').length).toBeGreaterThan(0);   // Final = 900 − 100, computed client-side
  });

  test('financial cockpit renders (Key Alerts + Profit Bridge + Cash Forecast + Leaderboard)', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText('ALERTS:1')).toBeInTheDocument();
    expect(screen.getByText('PNL')).toBeInTheDocument();
    expect(screen.getByText('FORECAST')).toBeInTheDocument();
    expect(screen.getByText('LEADER')).toBeInTheDocument();
  });
});

describe('Owner Dashboard — Sales Reconciliation bridge (single branch)', () => {
  const RECON = {
    revenue: 31490745,
    buckets: [
      { key: 'sopogp', label: 'SO/PO/GP (forward sales)', sign: '+', amount: 22151862, count: 385 },
      { key: 'inb',    label: 'INB inter-branch',         sign: '+', amount: 11519458, count: 274 },
      { key: 'refund', label: 'Refund / Reissue',         sign: '-', amount: -2181143, count: 42 },
      { key: 'other',  label: 'Other / Manual',           sign: '+', amount: 0, count: 0 },
    ],
    bucketSum: 31490177, residual: 0, reconciles: true,
  };
  beforeEach(() => {
    mockUseAgeing.mockReturnValue({ data: { receivables: { totals: {} }, payables: { totals: {} } } });
    useDirectorDashboard.mockReturnValue({ data: { ...LOADED, salesRecon: RECON }, totalCashInr: 0, isLoading: false, isError: false, refetch: jest.fn() });
  });

  test('renders the origin buckets and shows the refund as an ABSOLUTE subtraction (no double negative)', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText(/Sales Reconciliation/)).toBeInTheDocument();
    expect(screen.getByText('SO/PO/GP (forward sales)')).toBeInTheDocument();
    expect(screen.getByText('INB inter-branch')).toBeInTheDocument();
    expect(screen.getByText('Refund / Reissue')).toBeInTheDocument();
    expect(screen.getByText('₹2181143')).toBeInTheDocument();   // refund rendered as |amount|
    expect(screen.queryByText('₹-2181143')).toBeNull();          // never a double-negative
    expect(screen.getByText('₹31490745')).toBeInTheDocument();   // bridge top == Revenue KPI value
  });

  test('a bucket row drills into its Approvals register', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    fireEvent.click(screen.getByText('Refund / Reissue').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/transactions/approvals?tab=refund');
  });

  test('flags drift (residual) when the endpoint does not reconcile', () => {
    useDirectorDashboard.mockReturnValue({ data: { ...LOADED, salesRecon: { ...RECON, reconciles: false, residual: 5000 } }, totalCashInr: 0, isLoading: false, isError: false, refetch: jest.fn() });
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText(/Unreconciled by/)).toBeInTheDocument();
  });

  test('hides the bridge on Group/ALL scope (no cross-currency merge)', () => {
    useDirectorDashboard.mockReturnValue({ data: { ...LOADED, salesRecon: RECON, bookingsByBranch: [] }, totalCashInr: 0, isLoading: false, isError: false, refetch: jest.fn() });
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.queryByText(/Sales Reconciliation/)).toBeNull();
  });
});

describe('Owner Dashboard — Gross Profit Reconciliation bridge (single branch)', () => {
  const GP_RECON = {
    gp: 1548000,
    buckets: [
      { key: 'sopogp',      label: 'SO/PO/GP (sale − cost)',       sign: '+', amount: 1236000, count: 768 },
      { key: 'inb',         label: 'INB inter-branch',            sign: '+', amount: 114000,  count: 548 },
      { key: 'refund',      label: 'Refund / Reissue',            sign: '+', amount: 19000,   count: 42 },
      { key: 'adjustments', label: 'Commission / Discounts / JV', sign: '+', amount: 179000,  count: 326 },
      { key: 'other',       label: 'Other / Manual',              sign: '+', amount: 0, count: 0 },
    ],
    bucketSum: 1548000, residual: 0, reconciles: true,
  };
  beforeEach(() => {
    mockUseAgeing.mockReturnValue({ data: { receivables: { totals: {} }, payables: { totals: {} } } });
    useDirectorDashboard.mockReturnValue({ data: { ...LOADED, gpRecon: GP_RECON }, totalCashInr: 0, isLoading: false, isError: false, refetch: jest.fn() });
  });

  test('renders the GP bridge incl the material Commission/Adjustments bucket', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    expect(screen.getByText(/Gross Profit Reconciliation/)).toBeInTheDocument();
    expect(screen.getByText('SO/PO/GP (sale − cost)')).toBeInTheDocument();
    expect(screen.getByText('Commission / Discounts / JV')).toBeInTheDocument();
    expect(screen.getByText('₹1548000')).toBeInTheDocument();   // bridge top == GP KPI value
    expect(screen.getByText('₹179000')).toBeInTheDocument();    // commission bucket
  });

  test('a GP bucket row drills into its Approvals register', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={{ code: 'BOM' }} />);
    fireEvent.click(screen.getByText('Commission / Discounts / JV').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/transactions/approvals?tab=adjustments');
  });

  test('hides the GP bridge on Group/ALL scope', () => {
    useDirectorDashboard.mockReturnValue({ data: { ...LOADED, gpRecon: GP_RECON, bookingsByBranch: [] }, totalCashInr: 0, isLoading: false, isError: false, refetch: jest.fn() });
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.queryByText(/Gross Profit Reconciliation/)).toBeNull();
  });
});

describe('Owner Dashboard — Group / ALL', () => {
  beforeEach(() => {
    mockUseAgeing.mockReturnValue({ data: {
      receivables: { totals: {} }, payables: { totals: {} },
      byBranch: [
        { branch: 'BOM', receivables: { totals: { a7: 1000, a15: 0, a30: 0, a45: 0, a60: 0, a61: 0, billed: 1000, settled: 240, total: 1000, onAccount: 240, net: 760 }, rows: [{ party: 'Global', a7: 1000, a15: 0, a30: 0, a45: 0, a60: 0, a61: 0, total: 1000, onAccount: 240, net: 760 }] }, payables: { totals: { total: 0, onAccount: 0, net: 0 }, rows: [] } },
        { branch: 'NBO', receivables: { totals: { a7: 500, a15: 0, a30: 0, a45: 0, a60: 0, a61: 0, billed: 500, settled: 220, total: 500, onAccount: 220, net: 280 }, rows: [{ party: 'Aamir', a7: 500, a15: 0, a30: 0, a45: 0, a60: 0, a61: 0, total: 500, onAccount: 220, net: 280 }] }, payables: { totals: { total: 0, onAccount: 0, net: 0 }, rows: [] } },
      ],
    } });
  });

  test('settlement renders per branch, each in its own currency', () => {
    render(<OwnerDashboardPage currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getAllByText('₹760').length).toBeGreaterThan(0);   // BOM Final Receivables in ₹
    expect(screen.getAllByText('$280').length).toBeGreaterThan(0);   // NBO Final Receivables in $
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
