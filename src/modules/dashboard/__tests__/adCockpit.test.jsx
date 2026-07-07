// AD Cockpit (Beta) — smoke test. Mocks the live hooks and asserts the sectioned dark
// cockpit renders its region hero (₹ India / $ Africa, never summed) and drills to a branch.
const branch = (code, currency) => ({ code, currency });
jest.mock('../../../core/data', () => ({
  BRANCHES: [branch('BOM', 'INR'), branch('BOMMB', 'INR'), branch('AMD', 'INR'), branch('NBO', 'USD'), branch('DAR', 'USD'), branch('FBM', 'USD')],
  branchMainCurrency: (b) => b.currency || 'INR',
  currencySymbol: (c) => (c === 'USD' ? '$' : '₹'),
}));
const mplRow = (code, sales, gp, net) => ({ branch: code, totals: { sales, gp }, bridge: { netProfit: net }, modules: [{ name: 'Flights', sales: sales * 0.7, gp: gp * 0.4 }, { name: 'Hotels', sales: sales * 0.2, gp: gp * 0.3 }] });
const ageRow = (code, recv, pay) => ({ branch: code, receivables: { totals: { total: recv, d90: recv * 0.2 }, rows: [{ party: `${code} Debtor`, total: recv, d90: recv * 0.2 }] }, payables: { totals: { total: pay } } });
jest.mock('../../../core/useAccounting', () => ({
  useModulePL: () => ({ data: { byBranch: [mplRow('BOM', 4820000, 386000, 124000), mplRow('NBO', 342000, 41000, 14000)], modules: [{ name: 'Flights', sales: 3700000, gp: 155000, gpPct: 4.2 }] } }),
  useAgeing: () => ({ data: { byBranch: [ageRow('BOM', 1590000, 964000), ageRow('NBO', 121000, 76000)] } }),
  useBalanceSheet: () => ({ data: { byBranch: [{ branch: 'BOM', liabilities: [{ name: 'Capital Account', amount: 7030000 }] }] } }),
  useTrialBalance: () => ({ data: { byBranch: [{ branch: 'BOM', rows: [] }] } }),
  useBudgetVsActual: () => ({ data: { rows: [{ name: 'Salaries', budget: 4200000, actual: 3980000 }, { name: 'Marketing', budget: 1200000, actual: 1480000 }] } }),
  useAlerts: () => ({ data: { alerts: [
    { severity: 'error', title: 'FBM net loss', detail: '−$2K MTD', domain: 'acct', type: 'neg-cashbank' },
    { severity: 'warn', title: 'Bank reconciliation pending', detail: '12 lines', domain: 'recon', type: 'recon-bank' },
    { severity: 'warn', title: 'GSTIN missing', detail: '3 parties', domain: 'masters', type: 'party-tax-id' },
  ] } }),
}));
jest.mock('../hooks/use-director-dashboard', () => ({
  useDirectorDashboard: () => ({
    data: {
      keyAlerts: [{ severity: 'error', title: 'FBM net loss', detail: '−$2K MTD', domain: 'acct', type: 'neg-cashbank' }],
      bankAccounts: [{ bank: 'ICICI · 3566', id: 'b1', currency: '₹', openingBal: 5106420 }, { bank: 'HDFC · 3261', id: 'b2', currency: '₹', openingBal: 5000000 }],
      bookingsByBranch: [{ branch: 'BOM', approved: { count: 10, sales: 6200000 }, pending: { count: 5, sales: 1800000 } }, { branch: 'NBO', approved: { count: 3, sales: 61000 }, pending: { count: 2, sales: 14000 } }],
      topCustomers: [{ name: 'Inaysha Travels', revenue: 9800000, share: 30, branch: 'BOM' }, { name: 'Akbar B2B', revenue: 7200000, share: 22, branch: 'BOM' }],
      topSuppliers: [{ name: 'TripJack', spend: 14200000, share: 35, branch: 'BOM' }],
      revenueTrend: [{ month: 'Apr', cy: 5800000, ly: 5000000 }, { month: 'May', cy: 6400000, ly: 5400000 }, { month: 'Jun', cy: 7900000, ly: 6200000 }],
    }, isLoading: false, isError: false,
  }),
}));
jest.mock('../../../core/period', () => ({ periodRange: () => ({ from: '2000-01-01', to: '2026-07-07', label: 'All' }) }));
jest.mock('../../../core/dates', () => ({ CUR_FY: { label: '2026–27' } }));

import { render, screen, fireEvent } from '@testing-library/react';
import { AdCockpitPage } from '../pages/ad-cockpit';

test('renders the sectioned cockpit with both currency regions (never summed)', () => {
  render(<AdCockpitPage />);
  expect(screen.getByText(/AD Cockpit/)).toBeInTheDocument();
  expect(screen.getAllByText(/India/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Africa/).length).toBeGreaterThan(0);
  // ₹ and $ both present — currencies shown side by side.
  expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/\$/).length).toBeGreaterThan(0);
});

test('clicking a region card drills into its branch chips', () => {
  const { container } = render(<AdCockpitPage />);
  fireEvent.click(container.querySelector('.hcard')); // first hero card = India (INR)
  // India branch chips now rendered (BOM is an India branch)
  expect(container.querySelector('[data-branch="BOM"]')).toBeTruthy();
});

test('period presets render (ALL default)', () => {
  render(<AdCockpitPage />);
  expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'FY' })).toBeInTheDocument();
});

test('Cash / Commercial / Governance sections render without error', () => {
  render(<AdCockpitPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Cash & WC' }));
  expect(screen.getByText(/Bank Balances/)).toBeInTheDocument();
  expect(screen.getByText(/ICICI/)).toBeInTheDocument(); // bank rows render (currency is a symbol, not a code — A/B fix)
  expect(screen.getByText(/Top Overdue Debtors/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Commercial' }));
  expect(screen.getByText(/SO \/ PO \/ GP Pipeline/)).toBeInTheDocument();
  expect(screen.getByText('Inaysha Travels')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Governance' }));
  expect(screen.getByText(/Data Integrity/)).toBeInTheDocument();
  expect(screen.getByText(/Expense Budget vs Actual/)).toBeInTheDocument();
});

test('Performance shows region Module GP + Revenue Trend; module row opens the drawer', () => {
  render(<AdCockpitPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Performance' }));
  expect(screen.getByText(/Gross Profit by Module/)).toBeInTheDocument();
  expect(screen.getByText(/Revenue Trend/)).toBeInTheDocument();
  // Clicking an aggregated module row opens the drill drawer with a route hook.
  fireEvent.click(screen.getAllByText('Flights')[0].closest('tr'));
  expect(screen.getByText(/Open Module GP report/)).toBeInTheDocument();
});
