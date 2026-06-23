// Branch & Group Performance: per-branch figures in native currency, plus a Group
// subtotal PER CURRENCY (₹ India branches and $ Africa branches never summed
// together). Each branch fans out two queries — module-pl and capital-analysis.
jest.mock('../../core/period', () => ({
  PeriodBar: () => null,
  periodRange: () => ({ from: '2026-04-01', to: '2026-06-20', label: 'CFY' }),
}));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));

// Per-branch fixtures, keyed by branch code.
const PL = {
  BOM: { totals: { sales: 1000, cogs: 700, gp: 300 }, bridge: { netProfit: 200 } },
  AMD: { totals: { sales: 500, cogs: 400, gp: 100 }, bridge: { netProfit: 60 } },
  TKHO: { totals: { sales: 0, cogs: 0, gp: 0 }, bridge: { netProfit: 0 } },
  NBO: { totals: { sales: 800, cogs: 500, gp: 300 }, bridge: { netProfit: 220 } },
  DAR: { totals: { sales: 200, cogs: 150, gp: 50 }, bridge: { netProfit: 30 } },
  FBM: { totals: { sales: 0, cogs: 0, gp: 0 }, bridge: { netProfit: 0 } },
};
const CAP = {
  BOM: { totals: { capitalInvested: 5000, inflowCapital: 4000 } },
  AMD: { totals: { capitalInvested: 2000, inflowCapital: 1500 } },
  TKHO: { totals: { capitalInvested: 0, inflowCapital: 0 } },
  NBO: { totals: { capitalInvested: 9000, inflowCapital: 7000 } },
  DAR: { totals: { capitalInvested: 1000, inflowCapital: 800 } },
  FBM: { totals: { capitalInvested: 0, inflowCapital: 0 } },
};
jest.mock('@tanstack/react-query', () => ({
  useQueries: ({ queries }) => queries.map((q) => {
    const kind = q.queryKey[1]; const code = q.queryKey[2];
    return { data: kind === 'capital-analysis' ? CAP[code] : PL[code], isLoading: false };
  }),
  useQuery: () => ({ data: {}, isLoading: false }),
}));

import { render, screen, within } from '@testing-library/react';
import { BranchPerformanceDash } from '../directorDashboards';

test('shows both currency-group subtotals, combined within currency only', () => {
  render(<BranchPerformanceDash />);
  // Group headers present
  expect(screen.getByText('India Group (₹)')).toBeInTheDocument();
  expect(screen.getByText('Africa Group ($)')).toBeInTheDocument();
  // Subtotal rows present
  expect(screen.getByText(/India Group \(₹\) — subtotal/)).toBeInTheDocument();
  expect(screen.getByText(/Africa Group \(\$\) — subtotal/)).toBeInTheDocument();
});

test('India group sums in ₹ (sales 1000+500 = 1,500), Africa group sums in $ (800+200 = 800... shown as $)', () => {
  render(<BranchPerformanceDash />);
  const indiaSub = screen.getByText(/India Group \(₹\) — subtotal/).closest('tr');
  expect(within(indiaSub).getByText('₹1,500')).toBeInTheDocument();   // BOM 1000 + AMD 500
  const africaSub = screen.getByText(/Africa Group \(\$\) — subtotal/).closest('tr');
  expect(within(africaSub).getByText('$1,000')).toBeInTheDocument();  // NBO 800 + DAR 200, in $
  expect(within(africaSub).getByText('$10,000')).toBeInTheDocument(); // capital NBO 9000 + DAR 1000
});

test('per-branch capital is shown in the branch native currency', () => {
  render(<BranchPerformanceDash />);
  // NBO capital invested 9000 rendered with a $ sign, not ₹
  expect(screen.getByText('$9,000')).toBeInTheDocument();
});
