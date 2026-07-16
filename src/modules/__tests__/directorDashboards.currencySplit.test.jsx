// D2 — consolidated (ALL) view currency split for the Director standalone dashboards.
// When a targets/budget/LTV/ABC response carries a non-empty `byCurrency`, the dashboard
// must render its KPI totals PER CURRENCY (₹ India / $ Africa), never one blended ₹ figure.
// Mirrors directorDashboards.nav.test.jsx's mock harness with byCurrency payloads added.
const tgt = (target, actual) => ({ name: 'Total', target, actual, variance: actual - target, pct: target ? Math.round((actual / target) * 100) : 0, status: actual >= target ? 'met' : 'short' });
jest.mock('../../core/useAccounting', () => ({
  useProfitAndLoss: () => ({ data: { netProfit: 25, byBranch: [{ branch: 'BOM', netProfit: 25 }] } }),
  useModulePL: () => ({ data: { totals: { sales: 100, gp: 30, gpPct: 30 }, byBranch: [{ branch: 'BOM', totals: { sales: 100, gp: 30, gpPct: 30 } }] } }),
  useBalanceSheet: () => ({ data: { byBranch: [] } }),
  useAgeing: () => ({ data: { byBranch: [] } }),
  useInvoiceGP: () => ({ data: {} }),
  useTaxSummary: () => ({ data: {} }),
  useTrialBalance: () => ({ data: {} }),
  useVoucherApprovals: () => ({ data: {} }),
  useYearOverYear: () => ({ data: {} }),
  useCashForecast: () => ({ data: { opening: 0, rows: [] } }),
  useTargetsVsActual: (_b, metric) => ({ data: {
    totals: tgt(1000, 800), rows: [{ name: 'Flights', ...tgt(600, 500) }],
    byCurrency: [
      { currency: 'INR', symbol: '₹', totals: { name: 'Total', ...tgt(900000, 720000) }, rows: [{ ...tgt(500000, 400000), name: `IN-${metric}` }] },
      { currency: 'USD', symbol: '$', totals: { name: 'Total', ...tgt(20000, 16000) }, rows: [{ ...tgt(9000, 7000), name: `AF-${metric}` }] },
    ],
  } }),
  useBudgetVsActual: () => ({ data: {
    months: 3, totals: { budget: 1000, actual: 900, variance: 100, pct: 90 }, rows: [{ name: 'Rent', group: 'Admin', budget: 600, actual: 500, variance: 100, pct: 83, status: 'ok' }],
    byCurrency: [
      { currency: 'INR', symbol: '₹', totals: { budget: 900000, actual: 810000, variance: 90000, pct: 90 }, rows: [{ name: 'IN-Rent', group: 'Admin', budget: 600000, actual: 500000, variance: 100000, pct: 83, status: 'ok' }] },
      { currency: 'USD', symbol: '$', totals: { budget: 20000, actual: 22000, variance: -2000, pct: 110 }, rows: [{ name: 'AF-Rent', group: 'Admin', budget: 12000, actual: 14000, variance: -2000, pct: 116, status: 'over' }] },
    ],
  } }),
  useCustomerLtv: () => ({ data: {
    totals: { customers: 2, ltv: 900, bookings: 5 }, rows: [{ name: 'Acme', ltv: 600, gp: 120, gpPct: 20, totalBookings: 3, avgBasket: 200, recencyDays: 10 }],
    byCurrency: [
      { currency: 'INR', symbol: '₹', totals: { customers: 1, ltv: 500000, bookings: 4 }, rows: [{ name: 'Mumbai Traders', ltv: 500000, gp: 80000, gpPct: 16, totalBookings: 4, avgBasket: 125000, recencyDays: 12 }] },
      { currency: 'USD', symbol: '$', totals: { customers: 1, ltv: 8000, bookings: 2 }, rows: [{ name: 'Nairobi Safaris', ltv: 8000, gp: 1600, gpPct: 20, totalBookings: 2, avgBasket: 4000, recencyDays: 20 }] },
    ],
  } }),
  useAbcAnalysis: () => ({ data: {
    classes: { A: { count: 1, value: 600, share: 100 }, B: { count: 0, value: 0, share: 0 }, C: { count: 0, value: 0, share: 0 } }, rows: [{ name: 'Acme', class: 'A' }],
    byCurrency: [
      { currency: 'INR', symbol: '₹', total: 500000, classes: { A: { count: 1, value: 400000, share: 80 }, B: { count: 0, value: 0, share: 0 }, C: { count: 0, value: 0, share: 0 } }, rows: [{ name: 'Mumbai Traders', class: 'A' }] },
      { currency: 'USD', symbol: '$', total: 8000, classes: { A: { count: 1, value: 6400, share: 80 }, B: { count: 0, value: 0, share: 0 }, C: { count: 0, value: 0, share: 0 } }, rows: [{ name: 'Nairobi Safaris', class: 'A' }] },
    ],
  } }),
}));
jest.mock('../../core/period', () => ({ PeriodBar: () => null, periodRange: () => ({ from: '2026-04-01', to: '2026-06-20', label: 'CFY' }) }));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));

import { render, screen } from '@testing-library/react';
import { CustomerValueDash, VsTargetDash, BudgetVsExpenseDash, PerformanceDash } from '../directorDashboards';

describe('D2 consolidated currency split — director dashboards', () => {
  test('Customer Value (LTV + ABC) splits into ₹ (India) and $ (Africa)', () => {
    render(<CustomerValueDash branch={'ALL'} />);
    expect(screen.getByText('(India)')).toBeInTheDocument();
    expect(screen.getByText('(Africa)')).toBeInTheDocument();
    expect(screen.getByText('Mumbai Traders')).toBeInTheDocument();
    expect(screen.getByText('Nairobi Safaris')).toBeInTheDocument();
  });

  test('Sales vs Target splits Target/Actual per currency', () => {
    render(<VsTargetDash branch={'ALL'} metric="sales" go={jest.fn()} />);
    expect(screen.getByText('(India)')).toBeInTheDocument();
    expect(screen.getByText('(Africa)')).toBeInTheDocument();
    // Each currency block lists its OWN module rows (never a blended one).
    expect(screen.getByText('IN-sales')).toBeInTheDocument();
    expect(screen.getByText('AF-sales')).toBeInTheDocument();
  });

  test('Budget vs Expense splits per currency', () => {
    render(<BudgetVsExpenseDash branch={'ALL'} go={jest.fn()} />);
    expect(screen.getByText('(India)')).toBeInTheDocument();
    expect(screen.getByText('(Africa)')).toBeInTheDocument();
    expect(screen.getByText('IN-Rent')).toBeInTheDocument();
    expect(screen.getByText('AF-Rent')).toBeInTheDocument();
  });

  test('Performance vs Target renders per-currency tile rows and tables', () => {
    render(<PerformanceDash branch={'ALL'} go={jest.fn()} />);
    // CurHead appears twice per currency (tiles section + tables section).
    expect(screen.getAllByText('(India)')).toHaveLength(2);
    expect(screen.getAllByText('(Africa)')).toHaveLength(2);
  });
});
