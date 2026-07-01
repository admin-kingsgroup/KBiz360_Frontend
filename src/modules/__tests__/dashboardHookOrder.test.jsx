// Regression: the Owner & Director dashboards must keep a STABLE React hook order
// across the loading → loaded transition.
//
// The bug this locks in (React error #300 "Rendered fewer hooks than expected"):
// `const perBranchKpis = React.useMemo(...)` used to sit AFTER the
// `if (isLoading || !data) return <Skeleton/>` early return. On the first
// (loading) render the component returned before reaching the useMemo, so it ran
// one fewer hook than the subsequent (loaded) render — React then threw #300 and
// the whole screen fell into its error boundary. The fix hoists the useMemo above
// the early returns. This test renders loading first, then re-renders loaded, and
// fails (throws) if the hook order regresses.
//
// Heavy children are stubbed — we only care that the component mounts through the
// transition without a hooks-order invariant violation.

const STORE = {
  compareLastYear: false,
  setCompareLastYear: jest.fn(),
  pinnedWidgets: [],
  togglePinnedWidget: jest.fn(),
};

jest.mock('../dashboard/hooks/use-director-dashboard', () => ({
  useDirectorDashboard: jest.fn(),
}));
jest.mock('../dashboard/hooks/use-dashboard-actions', () => ({
  useDashboardActions: () => ({ navigate: jest.fn() }),
}));
jest.mock('../dashboard/store/dashboard.store', () => ({
  useDashboardStore: (sel) => sel({
    compareLastYear: false,
    setCompareLastYear: jest.fn(),
    pinnedWidgets: [],
    togglePinnedWidget: jest.fn(),
  }),
}));
jest.mock('../../core/useAccounting', () => ({
  useModulePL: () => ({ data: {} }),
  useBalanceSheet: () => ({ data: {} }),
  useAgeing: () => ({ data: {} }),
  useTaxSummary: () => ({ data: {} }),
  useTrialBalance: () => ({ data: {} }),
  useTargetsVsActual: () => ({ data: { totals: { actual: 0, target: 0 } } }),
}));
// useQueries is indexed per-branch (bq[i].data); return {data:{}} for any index.
jest.mock('@tanstack/react-query', () => ({
  useQueries: () => new Proxy([], { get: (t, p) => (p in t || typeof p === 'symbol' ? t[p] : { data: {} }) }),
}));
// core/api uses import.meta (Vite) which jest's CJS transform can't parse.
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: () => 'open' }));
jest.mock('../../core/period', () => ({
  PeriodBar: () => null,
  periodRange: () => ({ from: '2026-04-01', to: '2026-06-29', label: 'CFY' }),
}));
jest.mock('../../core/styleTokens', () => ({ bc: () => ({ cur: '₹' }) }));
// Layout/primitive stubs — passthrough so children still mount.
jest.mock('../../core/styles', () => ({
  KPICard: ({ children }) => <div>{children}</div>,
  WidgetCard: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../core/helpers', () => ({ DashboardHeader: ({ title }) => <h1>{title}</h1> }));
jest.mock('../../shell/PageLayout', () => ({ PageLayout: ({ children }) => <div>{children}</div> }));
jest.mock('../../shell/primitives', () => ({ ResponsiveGrid: ({ children }) => <div>{children}</div> }));
jest.mock('../../core/ux/DashboardSkeleton', () => ({ DashboardSkeleton: () => <div>loading…</div> }));
jest.mock('../../core/ux/DashboardError', () => ({ DashboardError: () => <div>error</div> }));
jest.mock('../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
// Visual children we don't need to assert on.
jest.mock('../dashboard/components/shared/RevenueTrendChart', () => ({ RevenueTrendChart: () => null }));
jest.mock('../dashboard/components/shared/FyTargetsPanel', () => ({ FyTargetsPanel: () => null }));
jest.mock('../dashboard/components/shared/ConsultantLeaderboard', () => ({ ConsultantLeaderboard: () => null }));
jest.mock('../dashboard/components/tables/TopEntitiesTable', () => ({ TopEntitiesTable: () => null }));

import { render, screen } from '@testing-library/react';
import { useDirectorDashboard } from '../dashboard/hooks/use-director-dashboard';
import { DirectorDashboardPage } from '../dashboard/pages/director-dashboard';
import { OwnerDashboardPage } from '../dashboard/pages/owner-dashboard';

const LOADED = {
  figures: { revenue: 0, gp: 0, gpPct: 0, netProfit: 0, outstanding: 0, payable: 0, cash: 0 },
  pendingBookings: { count: 0, sales: 0, gp: 0 },
  approvedBookings: { count: 0, sales: 0, gp: 0 },
  revenueTrend: [],
  topCustomers: [],
  topConsultants: [],
  topSuppliers: [],
};

afterEach(() => jest.clearAllMocks());

describe.each([
  ['Director', DirectorDashboardPage, 'Director Dashboard'],
  // Owner dashboard header was renamed to "AD Dashboard (All)" (owner-dashboard.jsx).
  ['Owner', OwnerDashboardPage, 'AD Dashboard (All)'],
])('%s dashboard — stable hook order across loading → loaded', (_name, Page, title) => {
  test('renders loading then loaded without a React hooks-order violation (#300)', () => {
    // 1) Loading render — hits the `if (isLoading) return <Skeleton/>` early return.
    useDirectorDashboard.mockReturnValue({ data: null, isLoading: true, isError: false, refetch: jest.fn() });
    const { rerender } = render(<Page currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText('loading…')).toBeInTheDocument();

    // 2) Loaded render — every hook (incl. the hoisted perBranchKpis useMemo) must
    //    run in the same order. A regression here throws React #300 and fails the test.
    useDirectorDashboard.mockReturnValue({ data: LOADED, totalCashInr: 0, isLoading: false, isError: false, refetch: jest.fn() });
    rerender(<Page currentUser={{ name: 'Owner' }} setRoute={jest.fn()} branch={'ALL'} />);
    expect(screen.getByText(title)).toBeInTheDocument();
  });
});
