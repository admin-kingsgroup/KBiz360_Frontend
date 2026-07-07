// Capital vs Investment renders the live Tally tree (group ▸ sub-group ▸ ledger) in the
// branch's own currency — ₹ for India, $ for the USD branches (NBO / DAR / FBM) — with
// ledgers collapsed under sub-groups and expandable on click.
jest.mock('../../core/period', () => ({
  PeriodBar: () => null,
  periodRange: (p) => ({ from: '2026-04-01', to: '2026-07-02', label: 'CFY', preset: p }),
}));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})) }));
jest.mock('../../core/styleTokens', () => ({
  bc: (b) => ({ cur: (b && (b.code === 'NBO' || b.code === 'DAR' || b.code === 'FBM')) ? '$' : '₹' }),
}));

const led = (name, amount, src = 'bs') => ({ name, amount, isGroup: false, src, items: [] });
const grp = (name, amount, items, src = 'bs') => ({ name, amount, isGroup: true, src, items });

const mockData = {
  totals: {
    capitalInvested: 5000000, capitalEmployed: 4500000, capitalBlocked: 1000000, inflowCapital: 4000000,
    grossProfit: 800000, grossRevenue: 6000000, gpYield: 20, gpMargin: 13.3, flowTurnover: 1.5,
    blockedPct: 20, inflowPct: 80, flowComposition: 4000000,
    quasiCapital: 0, externalFunding: 500000, totalLiabilities: 5500000, totalAssets: 5500000, bsBalanced: true,
    indirectIncome: 100000, indirectExpense: 300000, netProfit: 600000, netMargin: 10, netYield: 15,
  },
  capital: [grp('Capital Account', 5000000, [led('Owner Capital', 5000000)])],
  quasi: [],
  capitalAdjust: [{ name: 'Less: Accumulated Loss (P&L A/c)', amount: -500000, isGroup: false, src: 'bs', items: [] }],
  blocked: [grp('Fixed Assets', 1000000, [led('Office Equipment', 1000000)])],
  flow: [grp('Current Assets', 4000000, [grp('Sundry Debtors', 4000000, [led('B2C Farhan', 4000000)])])],
  revenue: [
    grp('Sales Accounts', 6000000, [led('Ticket Sales', 6000000, 'pl')], 'pl'),
    grp('Less: Purchase Accounts', -5200000, [led('Airline Cost', -5200000, 'pl')], 'pl'),
  ],
  otherFunding: [],
  balanceSheet: {
    liabilities: [grp('Capital Account', 5000000, [led('Owner Capital', 5000000)])],
    assets: [grp('Current Assets', 5500000, [grp('Bank Accounts', 5500000, [led('Bank HDFC', 5500000)])])],
    totalLiabilities: 5500000, totalAssets: 5500000, balanced: true,
  },
  profitAndLoss: {
    statement: [
      grp('Sales Accounts', 6000000, [led('Ticket Sales', 6000000, 'pl')], 'pl'),
      grp('Less: Purchase Accounts', -5200000, [led('Airline Cost', -5200000, 'pl')], 'pl'),
      grp('Add: Indirect Income', 100000, [led('Commission', 100000, 'pl')], 'pl'),
      grp('Less: Indirect Expenses', -300000, [led('Salaries', -300000, 'pl')], 'pl'),
    ],
    sales: [grp('Sales Accounts', 6000000, [led('Ticket Sales', 6000000, 'pl')], 'pl')],
    cogs: [grp('Purchase Accounts', 5200000, [led('Airline Cost', 5200000, 'pl')], 'pl')],
    indirectIncome: [grp('Indirect Income', 100000, [led('Commission', 100000, 'pl')], 'pl')],
    indirectExpense: [grp('Indirect Expenses', 300000, [led('Salaries', 300000, 'pl')], 'pl')],
    grossProfit: 800000, netProfit: 600000,
  },
};
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: mockData, isLoading: false, error: null }) }));

import { render, screen, fireEvent } from '@testing-library/react';
import { CapitalVsInvestmentLive } from '../reportsFinancial/capitalVsInvestment';

test('India branch (BOM) renders ₹ figures', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/\$5/)).toBeNull();
});

test('USD branch (NBO) renders $ figures — group header + expanded ledger in branch currency', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'NBO' }} />);
  expect(screen.getAllByText(/\$/).length).toBeGreaterThan(0);
  // Groups are collapsed by default; the always-visible top-group header carries the $ amount.
  expect(screen.getAllByText('Capital Account')[0].closest('.grphd')).toHaveTextContent('$');
  // Expand the group and its ledger shows in branch currency too.
  fireEvent.click(screen.getAllByText('Capital Account')[0]);
  expect(screen.getAllByText('Owner Capital')[0].closest('.led')).toHaveTextContent('$');
});

test('top-level groups are collapsed by default and collapse/expand on header click', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  // Office Equipment is a leaf under the top-level "Fixed Assets" group → hidden by default.
  expect(screen.queryByText('Office Equipment')).toBeNull();
  fireEvent.click(screen.getByText('Fixed Assets'));       // expand the top group
  expect(screen.getByText('Office Equipment')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Fixed Assets'));       // collapse it again
  expect(screen.queryByText('Office Equipment')).toBeNull();
});

test('nested ledgers stay hidden until each level (top group ▸ sub-group) is expanded', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  // Bank HDFC is two levels deep: Current Assets ▸ Bank Accounts ▸ Bank HDFC.
  expect(screen.queryByText('Bank HDFC')).toBeNull();
  expect(screen.queryByText('Bank Accounts')).toBeNull();  // sub-group hidden while top group is collapsed
  screen.getAllByText('Current Assets').forEach((el) => fireEvent.click(el)); // expand top group
  fireEvent.click(screen.getByText('Bank Accounts'));       // expand sub-group
  expect(screen.getByText('Bank HDFC')).toBeInTheDocument();
});

test('Expand all / Collapse all fold and unfold every level', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  expect(screen.queryByText('Office Equipment')).toBeNull();          // collapsed by default
  screen.getAllByText(/Expand all/).forEach((b) => fireEvent.click(b));
  expect(screen.getAllByText('Office Equipment').length).toBeGreaterThan(0);
  screen.getAllByText(/Collapse all/).forEach((b) => fireEvent.click(b));
  expect(screen.queryByText('Office Equipment')).toBeNull();
});

test('Section 1 shows Capital Invested and Capital Employed as distinct totals + Less line', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  expect(screen.getByText('CAPITAL INVESTED')).toBeInTheDocument();
  expect(screen.getByText('CAPITAL EMPLOYED')).toBeInTheDocument();
  expect(screen.getAllByText(/Less: Accumulated Loss/).length).toBeGreaterThan(0);
});

test('sidebar nav renders and selecting a link marks it active', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  const bsLink = screen.getByRole('button', { name: /Balance Sheet$/ });
  expect(bsLink).toHaveClass('navlink');
  fireEvent.click(bsLink);
  expect(bsLink).toHaveClass('on');
});

test('period presets switch the active pill', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  const mtd = screen.getByRole('button', { name: 'MTD' });
  fireEvent.click(mtd);
  expect(mtd).toHaveClass('on');
});
