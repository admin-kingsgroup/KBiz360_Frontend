// AD Cockpit (Beta) — smoke test. Mocks the live hooks and asserts the sectioned dark
// cockpit renders its region hero (₹ India / $ Africa, never summed) and drills to a branch.
const branch = (code, currency) => ({ code, currency });
jest.mock('../../../core/data', () => ({
  BRANCHES: [branch('BOM', 'INR'), branch('BOMMB', 'INR'), branch('AMD', 'INR'), branch('NBO', 'USD'), branch('DAR', 'USD'), branch('FBM', 'USD')],
  branchMainCurrency: (b) => b.currency || 'INR',
  currencySymbol: (c) => (c === 'USD' ? '$' : '₹'),
}));
const mplRow = (code, sales, gp, net) => ({ branch: code, totals: { sales, gp }, bridge: { netProfit: net } });
const ageRow = (code, recv, pay) => ({ branch: code, receivables: { totals: { total: recv, d90: recv * 0.2 } }, payables: { totals: { total: pay } } });
jest.mock('../../../core/useAccounting', () => ({
  useModulePL: () => ({ data: { byBranch: [mplRow('BOM', 4820000, 386000, 124000), mplRow('NBO', 342000, 41000, 14000)], modules: [{ name: 'Flights', sales: 3700000, gp: 155000, gpPct: 4.2 }] } }),
  useAgeing: () => ({ data: { byBranch: [ageRow('BOM', 1590000, 964000), ageRow('NBO', 121000, 76000)] } }),
  useBalanceSheet: () => ({ data: { byBranch: [{ branch: 'BOM', liabilities: [{ name: 'Capital Account', amount: 7030000 }] }] } }),
  useTrialBalance: () => ({ data: { byBranch: [{ branch: 'BOM', rows: [] }] } }),
}));
jest.mock('../hooks/use-director-dashboard', () => ({
  useDirectorDashboard: () => ({
    data: {
      keyAlerts: [{ severity: 'error', title: 'FBM net loss', detail: '−$2K MTD', domain: 'acct', type: 'neg-cashbank' }],
      bankAccounts: [{ name: 'ICICI · 3566', currency: 'INR', openingBal: 5106420 }, { name: 'NBO · KCB', currency: 'USD', openingBal: 88000 }],
      bookingsByBranch: [{ branch: 'BOM', approved: { count: 10, sales: 6200000 }, pending: { count: 5, sales: 1800000 } }, { branch: 'NBO', approved: { count: 3, sales: 61000 }, pending: { count: 2, sales: 14000 } }],
      topCustomers: [{ name: 'Inaysha Travels', revenue: 9800000, share: 30, branch: 'BOM' }, { name: 'Akbar B2B', revenue: 7200000, share: 22, branch: 'BOM' }],
      topSuppliers: [{ name: 'TripJack', spend: 14200000, share: 35, branch: 'BOM' }],
    }, isLoading: false, isError: false,
  }),
}));
jest.mock('../../../core/period', () => ({ periodRange: () => ({ from: '2000-01-01', to: '2026-07-07', label: 'All' }) }));

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
  fireEvent.click(screen.getByRole('button', { name: 'Commercial' }));
  expect(screen.getByText(/SO \/ PO \/ GP Pipeline/)).toBeInTheDocument();
  expect(screen.getByText('Inaysha Travels')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Governance' }));
  expect(screen.getByText(/Data Integrity/)).toBeInTheDocument();
});
