// Branch Dashboard: the booking KPI tiles must be symmetric (Deleted has a GP tile like
// Approved/Pending/Rejected), the Bookings tile drills to the bookings list with a
// currency-formatted average, and the growth badge reads "vs last mo" (not "vs Apr").
// Heavy panels are stubbed; the REAL KpiTile renders so we can assert tile text + drills.
const mockNavigate = jest.fn();
const mockUseTrialBalance = jest.fn(() => ({ data: { rows: [] } }));
jest.mock('../hooks/use-branch-dashboard', () => ({ useBranchDashboard: jest.fn() }));
jest.mock('../hooks/use-dashboard-actions', () => ({ useDashboardActions: () => ({ navigate: mockNavigate }) }));
jest.mock('../../../core/useAccounting', () => ({ useTrialBalance: (...args) => mockUseTrialBalance(...args) }));
jest.mock('../../../core/period', () => ({ PeriodBar: () => null, periodRange: () => ({ from: '2026-04-01', to: '2026-06-30', label: 'CFY' }) }));
jest.mock('../../../shell/PageLayout', () => ({ PageLayout: ({ children }) => <div>{children}</div> }));
jest.mock('../../../shell/primitives', () => ({ ResponsiveGrid: ({ children }) => <div>{children}</div> }));
jest.mock('../../../core/ux/DashboardSkeleton', () => ({ DashboardSkeleton: () => <div>loading…</div> }));
jest.mock('../../../core/ux/DashboardError', () => ({ DashboardError: () => <div>error</div> }));
// Stub the heavy panels — we only assert the KpiTiles (real component).
jest.mock('../components/shared/BranchHeader', () => ({ BranchHeader: () => null }));
jest.mock('../components/shared/NeedsActionStrip', () => ({ NeedsActionStrip: () => null }));
jest.mock('../components/shared/YoyStrip', () => ({ YoyStrip: () => null }));
jest.mock('../components/shared/PnlWaterfallPanel', () => ({ PnlWaterfallPanel: () => null }));
jest.mock('../components/shared/CashForecastPanel', () => ({ CashForecastPanel: () => null }));
jest.mock('../components/shared/AgeingPanel', () => ({ AgeingPanel: () => null }));
jest.mock('../components/shared/BalanceHealthPanel', () => ({ BalanceHealthPanel: () => null }));
jest.mock('../components/shared/CapitalPanel', () => ({ CapitalPanel: () => null }));
jest.mock('../components/shared/TargetsPanel', () => ({ TargetsPanel: () => null }));
jest.mock('../components/shared/TopCustomersPanel', () => ({ TopCustomersPanel: () => null }));
jest.mock('../components/shared/GpByModulePanel', () => ({ GpByModulePanel: () => null }));
jest.mock('../components/shared/ConsultantLeaderboard', () => ({ ConsultantLeaderboard: ({ title }) => <div>{title}</div> }));
jest.mock('../components/shared/ActionItemsPanel', () => ({ ActionItemsPanel: () => null }));
jest.mock('../components/shared/UpcomingTravelPanel', () => ({ UpcomingTravelPanel: ({ onViewAll }) => <button onClick={onViewAll}>travel-all</button> }));
jest.mock('../components/cards/QuickStatsCard', () => ({ QuickStatsCard: () => null }));
jest.mock('../components/shared/QuickCreateBar', () => ({ QuickCreateBar: () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useBranchDashboard } from '../hooks/use-branch-dashboard';
import { BranchDashboardPage } from '../pages/branch-dashboard';

const DATA = {
  kpis: { revenue: 1000, gp: 300, gpPct: 30, netProfit: 200, outstanding: 50, payable: 40, cost: 700, expenses: 100, bookings: 4, ytdRevenue: 5000, ytdGp: 1500, revenueGrowth: 12, gpGrowth: 8 },
  gpByModule: [], topConsultants: [], actionItems: [], upcomingTravel: [], billsYtd: [],
  pendingBookings: { count: 1, sales: 100, purchase: 60, gp: 40 },
  approvedBookings: { count: 2, sales: 200, purchase: 120, gp: 80 },
  rejectedBookings: { count: 0, sales: 0, purchase: 0, gp: 0 },
  deletedBookings: { count: 1, sales: 90, purchase: 50, gp: 40 },
};

afterEach(() => jest.clearAllMocks());

describe('Branch Dashboard — booking tiles + growth label', () => {
  beforeEach(() => {
    useBranchDashboard.mockReturnValue({ data: DATA, isLoading: false, isError: false, refetch: jest.fn(), branchCode: 'BOM', currencySymbol: '₹', isIndia: true });
  });

  test('has a Deleted GP tile (symmetry with Approved/Pending/Rejected GP)', () => {
    render(<BranchDashboardPage branch={{ code: 'BOM' }} setRoute={jest.fn()} />);
    expect(screen.getByText('Deleted GP')).toBeInTheDocument();
  });

  test('Bookings tile shows a currency-formatted average and drills to the bookings list', () => {
    render(<BranchDashboardPage branch={{ code: 'BOM' }} setRoute={jest.fn()} />);
    // avg = 1000/4 = 250 → "₹250 avg" (currency-formatted, not a bare number)
    expect(screen.getByText(/₹250 avg/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Bookings:/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/list');
  });

  test('growth badge reads "vs last mo", never "vs Apr"', () => {
    render(<BranchDashboardPage branch={{ code: 'BOM' }} setRoute={jest.fn()} />);
    expect(screen.getAllByText(/vs last mo/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/vs Apr/)).toBeNull();
  });

  test('UpcomingTravel "All →" is wired to the bookings list', () => {
    render(<BranchDashboardPage branch={{ code: 'BOM' }} setRoute={jest.fn()} />);
    fireEvent.click(screen.getByText('travel-all'));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/list');
  });

  test('Consultant Leaderboard is labelled MTD', () => {
    render(<BranchDashboardPage branch={{ code: 'BOM' }} setRoute={jest.fn()} />);
    expect(screen.getByText('🏆 Top earners · MTD')).toBeInTheDocument();
  });

  test('Cash & Bank tile fetches the trial balance with NO `from` cutoff (true as-of-date closing)', () => {
    render(<BranchDashboardPage branch={{ code: 'BOM' }} setRoute={jest.fn()} />);
    // Must pass only { to } — a `from` would drop pre-period movement and mis-state the
    // closing balance (it adds the full inception opening).
    const opts = mockUseTrialBalance.mock.calls[0][1];
    expect(opts).toEqual({ to: '2026-06-30' });
    expect(opts.from).toBeUndefined();
  });

  test('Group/ALL scope shows a "pick a branch" note instead of merged cross-currency figures', () => {
    render(<BranchDashboardPage branch={'ALL'} setRoute={jest.fn()} />);
    expect(screen.getByText(/single-branch view/)).toBeInTheDocument();
    expect(screen.queryByText('Deleted GP')).toBeNull();   // KPI tiles not rendered in ALL
  });
});
