// Phase B: the boards whose backend returns `byBranch` now render each branch SEPARATELY in
// the consolidated (ALL) view — each in its own currency, never a merged cross-currency (₹+$)
// block. Two branches (BOM ₹ / NBO $) must both appear as their own section.
jest.mock('../../core/useAccounting', () => ({
  useProfitAndLoss: () => ({ data: { byBranch: [
    { branch: 'BOM', netProfit: 100, grossProfit: 200, indirect: {} },
    { branch: 'NBO', netProfit: 5, grossProfit: 8, indirect: {} },
  ] } }),
  useModulePL: () => ({ data: { byBranch: [
    { branch: 'BOM', totals: { sales: 1000, cogs: 700, gp: 300, gpPct: 30 }, modules: [], indirect: { expense: 50, groups: [] } },
    { branch: 'NBO', totals: { sales: 40, cogs: 25, gp: 15, gpPct: 37 }, modules: [], indirect: { expense: 3, groups: [] } },
  ] } }),
  useBalanceSheet: () => ({ data: { byBranch: [
    { branch: 'BOM', assets: [{ group: 'Cash', amount: 100 }], liabilities: [{ group: 'Capital', amount: 100 }] },
    { branch: 'NBO', assets: [{ group: 'Cash', amount: 9 }], liabilities: [{ group: 'Capital', amount: 9 }] },
  ] } }),
  useTrialBalance: () => ({ data: { byBranch: [{ branch: 'BOM', rows: [] }, { branch: 'NBO', rows: [] }] } }),
  useAgeing: () => ({ data: { byBranch: [
    { branch: 'BOM', receivables: { totals: {}, rows: [] }, payables: { totals: {}, rows: [] } },
    { branch: 'NBO', receivables: { totals: {}, rows: [] }, payables: { totals: {}, rows: [] } },
  ] } }),
  useTaxSummary: () => ({ data: { byBranch: [{ branch: 'BOM', netPayable: 10 }, { branch: 'NBO', netPayable: 2 }] } }),
  useInvoiceGP: () => ({ data: { rows: [] } }),
  useVoucherApprovals: () => ({ data: {} }),
  useYearOverYear: () => ({ data: { byBranch: [
    { branch: 'BOM', current: { label: 'FY25' }, prior: { label: 'FY24' }, rows: [{ line: 'Revenue', cy: 1000, ly: 800, group: 'Income' }] },
    { branch: 'NBO', current: { label: 'FY25' }, prior: { label: 'FY24' }, rows: [{ line: 'Revenue', cy: 40, ly: 30, group: 'Income' }] },
  ] } }),
  useCashForecast: () => ({ data: { byBranch: [
    { branch: 'BOM', opening: 500, rows: [{ week: 'W1', inflow: 10, outflow: 5, closing: 505 }] },
    { branch: 'NBO', opening: 20, rows: [{ week: 'W1', inflow: 1, outflow: 0, closing: 21 }] },
  ] } }),
}));
jest.mock('../../core/period', () => ({ PeriodBar: () => null, periodRange: () => ({ from: '2026-04-01', to: '2026-06-20', label: 'CFY' }) }));
// Per-branch currency: NBO is USD, everything else ₹ — so a merge would be a bug.
jest.mock('../../core/styles', () => ({ bc: (b) => ({ cur: (b && (b.code || b)) === 'NBO' ? '$' : '₹' }) }));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));

import { render, screen } from '@testing-library/react';
import { CashLiquidityDash, ReceivablesPayablesDash, BalanceSheetDash, ModuleGpDash, ExpensesDash,
  TaxComplianceDash, SalesBookingsDash, SupplierPurchaseDash, ProfitabilityDash,
  CashForecastDash, YoYGrowthDash } from '../directorDashboards';

const BOARDS = [
  ['Cash & Liquidity', CashLiquidityDash],
  ['Receivables & Payables', ReceivablesPayablesDash],
  ['Balance Sheet', BalanceSheetDash],
  ['Module / Product GP', ModuleGpDash],
  ['Expenses', ExpensesDash],
  ['Tax & Compliance', TaxComplianceDash],
  ['Sales & Bookings', SalesBookingsDash],
  ['Supplier / Purchase', SupplierPurchaseDash],
  ['Profitability (P&L)', ProfitabilityDash],
  // Phase A (backend byBranch newly added):
  ['Cash Forecast (13-week)', CashForecastDash],
  ['YoY Growth', YoYGrowthDash],
];

describe('Phase B — consolidated (ALL) view renders per-branch, not a merged block', () => {
  test.each(BOARDS)('%s shows a BOM section AND an NBO section in ALL view', (_name, Board) => {
    render(<Board branch={'ALL'} go={jest.fn()} />);
    expect(screen.getAllByText('BOM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NBO').length).toBeGreaterThan(0);
  });
});
