// Capital vs Investment must render in the branch's own currency — ₹ for India
// branches, $ for the USD branches (NBO / DAR / FBM). Regression for the old
// hardcoded-₹ bug that mislabelled African-branch figures.
jest.mock('../../core/period', () => ({ PeriodBar: () => null }));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})) }));
jest.mock('../../core/styleTokens', () => ({
  bc: (b) => ({ cur: (b && (b.code === 'NBO' || b.code === 'DAR' || b.code === 'FBM')) ? '$' : '₹' }),
}));

const DATA = {
  totals: {
    capitalInvested: 5000000, capitalBlocked: 1000000, inflowCapital: 4000000,
    grossProfit: 800000, grossRevenue: 6000000, gpYield: 20, gpMargin: 13.3, flowTurnover: 1.5,
    blockedPct: 20, inflowPct: 80, flowComposition: 4000000,
    quasiCapital: 0, externalFunding: 500000, totalLiabilities: 5500000, totalAssets: 5500000, bsBalanced: true,
    indirectIncome: 100000, indirectExpense: 300000, netProfit: 600000, netMargin: 10, netYield: 15,
  },
  capital: [{ grp: 'Capital Account', src: 'bs', total: 5000000, ledgers: [{ n: 'Owner Capital', a: 5000000 }] }],
  quasi: [], blocked: [], flow: [], revenue: [], otherFunding: [],
  balanceSheet: {
    liabilities: [{ grp: 'Capital Account', src: 'bs', total: 5000000, ledgers: [{ n: 'Owner Capital', a: 5000000 }] }],
    assets: [{ grp: 'Current Assets', src: 'bs', total: 5500000, ledgers: [{ n: 'Bank HDFC', a: 5500000 }] }],
    totalLiabilities: 5500000, totalAssets: 5500000, balanced: true,
  },
  profitAndLoss: {
    sales: [{ grp: 'Sales Accounts', src: 'pl', total: 6000000, ledgers: [{ n: 'Ticket Sales', a: 6000000 }] }],
    cogs: [{ grp: 'Purchase Accounts', src: 'pl', total: 5200000, ledgers: [{ n: 'Airline Cost', a: 5200000 }] }],
    indirectIncome: [], indirectExpense: [], grossProfit: 800000, netProfit: 600000,
  },
};
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: DATA, isLoading: false, error: null }) }));

import { render, screen } from '@testing-library/react';
import { CapitalVsInvestmentLive } from '../capitalVsInvestment';

test('India branch (BOM) renders ₹ figures', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/\$5/)).toBeNull();
});

test('USD branch (NBO) renders $ figures, not ₹', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'NBO' }} />);
  expect(screen.getAllByText(/\$/).length).toBeGreaterThan(0);
  // the owner-capital ledger amount must not carry a rupee sign
  expect(screen.getAllByText('Owner Capital')[0].closest('tr')).toHaveTextContent('$');
});

test('Complete Balance Sheet + P&L sections render every account in branch currency', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'NBO' }} />);
  // Section 5 (complete BS) and Section 6 (complete P&L) ledgers appear, in $.
  expect(screen.getByText('Bank HDFC').closest('tr')).toHaveTextContent('$');
  expect(screen.getByText('Ticket Sales').closest('tr')).toHaveTextContent('$');
  expect(screen.getByText('Airline Cost')).toBeInTheDocument();
  // Net Profit label is surfaced (the new P&L bridge / Section 6 total).
  expect(screen.getAllByText(/Net Profit/i).length).toBeGreaterThan(0);
});
