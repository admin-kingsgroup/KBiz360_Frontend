// A branch with no postings must still render the full Capital vs Investment report with
// every figure at zero and a neutral "no postings yet" banner — NOT a dead-end empty state.
jest.mock('../../core/period', () => ({
  PeriodBar: () => null,
  periodRange: (p) => ({ from: '2026-04-01', to: '2026-07-02', label: 'CFY', preset: p }),
}));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})) }));
jest.mock('../../core/styleTokens', () => ({ bc: () => ({ cur: '$' }) }));

// All-zero payload — exactly what the backend returns for MHUB / NBO / DAR / FBM / AMD.
const zeroData = {
  totals: {
    capitalInvested: 0, capitalEmployed: 0, capitalBlocked: 0, inflowCapital: 0,
    grossProfit: 0, grossRevenue: 0, gpYield: 0, gpMargin: 0, flowTurnover: 0,
    blockedPct: 0, inflowPct: 0, flowComposition: 0, quasiCapital: 0, externalFunding: 0,
    totalLiabilities: 0, totalAssets: 0, bsBalanced: true,
    indirectIncome: 0, indirectExpense: 0, netProfit: 0, netMargin: 0, netYield: 0,
  },
  capital: [], quasi: [], capitalAdjust: [], blocked: [], flow: [], revenue: [],
  otherFunding: [],
  balanceSheet: { liabilities: [], assets: [], totalLiabilities: 0, totalAssets: 0, balanced: true },
  profitAndLoss: { statement: [], sales: [], cogs: [], indirectIncome: [], indirectExpense: [], grossProfit: 0, netProfit: 0 },
};
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: zeroData, isLoading: false, error: null }) }));

import { render, screen } from '@testing-library/react';
import { CapitalVsInvestmentLive } from '../reportsFinancial/capitalVsInvestment';

test('empty branch renders the report with zeros + neutral banner, not an empty state', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'NBO' }} />);
  // Neutral banner instead of the good/bad verdict…
  expect(screen.getByText(/No postings recorded for this period yet/)).toBeInTheDocument();
  // …and the actual report renders (KPI strip is present) rather than a dead-end message.
  expect(screen.getAllByText('Gross Profit').length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Capital Employed/).length).toBeGreaterThan(0);
  // Old dead-end empty state must be gone.
  expect(screen.queryByText(/Record vouchers to populate the capital-vs-investment analysis/)).toBeNull();
});
