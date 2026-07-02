// Capital vs Investment must render in the branch's own currency — ₹ for India
// branches, $ for the USD branches (NBO / DAR / FBM). Regression for the old
// hardcoded-₹ bug that mislabelled African-branch figures.
jest.mock('../../core/period', () => ({
  PeriodBar: () => null,
  periodRange: (p) => ({ from: '2026-04-01', to: '2026-07-02', label: 'CFY', preset: p }),
}));
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
  quasi: [],
  capitalAdjust: [{ grp: 'Less: Accumulated Loss (P&L A/c)', src: 'bs', total: -500000, ledgers: [{ n: 'Profit & Loss A/c', a: -500000 }] }],
  blocked: [], flow: [], revenue: [], otherFunding: [],
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

import { render, screen, fireEvent } from '@testing-library/react';
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

test('Balance Sheet & P&L expand on click and render in branch currency', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'NBO' }} />);
  // Sections 5 & 6 start collapsed → content hidden.
  expect(screen.queryByText('Current Assets')).toBeNull();
  expect(screen.queryByText('Ticket Sales')).toBeNull();
  fireEvent.click(screen.getByText('Complete Balance Sheet')); // expand Section 5
  fireEvent.click(screen.getByText('Complete Profit & Loss')); // expand Section 6
  expect(screen.getByText('Current Assets').closest('tr')).toHaveTextContent('$');
  expect(screen.getByText('Ticket Sales').closest('tr')).toHaveTextContent('$');
  expect(screen.getByText('Airline Cost')).toBeInTheDocument();
});

test('Performance / Balance Sheet / P&L collapse by default and expand on click', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  expect(screen.queryByText(/GROSS PROFIT/)).toBeNull();  // Section 4 body hidden
  expect(screen.queryByText('Current Assets')).toBeNull(); // Section 5 body hidden
  fireEvent.click(screen.getByText('Turnover · Gross Profit · Net Profit'));
  expect(screen.getByText(/GROSS PROFIT/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('Complete Balance Sheet'));
  expect(screen.getByText('Current Assets')).toBeInTheDocument();
});

test('accumulated-loss deduction renders as a Less: line in Section 1', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  // The deduction line is visible so the ledger rows reconcile to CAPITAL EMPLOYED.
  expect(screen.getAllByText(/Less: Accumulated Loss/).length).toBeGreaterThan(0);
});

test('sidebar nav renders and selecting a link marks it active', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  // Rail link ends in "Balance Sheet"; the Section-5 header button is "Complete …".
  const bsLink = screen.getByRole('button', { name: /Balance Sheet$/ });
  expect(bsLink).toHaveClass('navlink');
  // Section 1 is always visible (not collapsible).
  expect(screen.getAllByText('Owner Capital').length).toBeGreaterThan(0);
  fireEvent.click(bsLink);
  expect(bsLink).toHaveClass('on');
});

test('period presets switch the active pill', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  const mtd = screen.getByRole('button', { name: 'MTD' });
  fireEvent.click(mtd);
  expect(mtd).toHaveClass('on');
});
