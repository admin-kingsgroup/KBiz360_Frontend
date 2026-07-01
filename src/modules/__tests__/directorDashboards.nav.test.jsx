// Director suite: KPI tiles drill into the matching report, and every dashboard
// has an Export control that fires the app-wide `kb:print` event.
jest.mock('../../core/useAccounting', () => ({
  // Group/ALL scope ⇒ ExecutiveOverview renders money KPIs PER BRANCH from each hook's
  // `byBranch` slice (each in its own currency), never a merged cross-branch total.
  useProfitAndLoss: jest.fn(() => ({ data: { netProfit: 25, byBranch: [{ branch: 'BOM', netProfit: 25 }] } })),
  useModulePL: jest.fn(() => ({ data: { totals: { sales: 100, gp: 30, gpPct: 30 }, byBranch: [{ branch: 'BOM', totals: { sales: 100, gp: 30, gpPct: 30 } }] } })),
  useBalanceSheet: jest.fn(() => ({ data: { byBranch: [{ branch: 'BOM', assets: [], liabilities: [] }] } })),
  useAgeing: jest.fn(() => ({ data: { byBranch: [{ branch: 'BOM', receivables: { totals: {} }, payables: { totals: {} } }] } })),
  useInvoiceGP: jest.fn(() => ({ data: {} })),
  useTaxSummary: jest.fn(() => ({ data: { output: { total: 50 }, input: { total: 20 }, netPayable: 30, byBranch: [{ branch: 'BOM', netPayable: 30 }] } })),
  useTrialBalance: jest.fn(() => ({ data: { byBranch: [{ branch: 'BOM', rows: [] }] } })),
  useVoucherApprovals: jest.fn(() => ({ data: {} })),
  useYearOverYear: jest.fn(() => ({ data: {} })),
  useBudgetVsActual: jest.fn(() => ({ data: {} })),
  useTargetsVsActual: jest.fn(() => ({ data: {} })),
  useSalesTargets: jest.fn(() => ({ data: [] })),
  useSaveTargets: jest.fn(() => ({ mutate: jest.fn() })),
  useCashForecast: jest.fn(() => ({ data: { opening: 1000, rows: [{ week: 'W1', inflow: 500, outflow: 200, closing: 1300 }, { week: 'W2', inflow: 0, outflow: 800, closing: 500 }] } })),
  useCustomerLtv: jest.fn(() => ({ data: { totals: { customers: 2, ltv: 900, bookings: 5 }, rows: [{ name: 'Acme', ltv: 600, gp: 120, gpPct: 20, totalBookings: 3, avgBasket: 200, recencyDays: 10 }] } })),
  useAbcAnalysis: jest.fn(() => ({ data: { classes: { A: { count: 1, value: 600, share: 67 }, B: { count: 1, value: 300, share: 33 }, C: { count: 0, value: 0, share: 0 } }, rows: [{ name: 'Acme', class: 'A' }] } })),
}));
jest.mock('../../core/period', () => ({
  PeriodBar: () => null,
  periodRange: () => ({ from: '2026-04-01', to: '2026-06-20', label: 'CFY' }),
}));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));

import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutiveOverview, TaxComplianceDash, CashForecastDash, YoYGrowthDash, CustomerValueDash,
  CashLiquidityDash, ModuleGpDash, SalesBookingsDash, SupplierPurchaseDash, ExpensesDash, BalanceSheetDash, VsTargetDash, PerformanceDash } from '../directorDashboards';

afterEach(() => jest.clearAllMocks());

describe('KPI drill-through', () => {
  test('Executive Overview Revenue tile navigates to Sales & Bookings', () => {
    const go = jest.fn();
    render(<ExecutiveOverview branch={'ALL'} go={go} />);
    fireEvent.click(screen.getByRole('button', { name: /Revenue/i }));
    expect(go).toHaveBeenCalledWith('/dashboards/sales');
  });

  test('Tax dashboard Net Payable tile navigates to GSTR-3B prep', () => {
    const go = jest.fn();
    render(<TaxComplianceDash branch={'ALL'} go={go} />);
    fireEvent.click(screen.getByRole('button', { name: /Net Payable/i }));
    expect(go).toHaveBeenCalledWith('/tax/gstr-3b-prep');
  });

  test('tiles are inert (no crash, not buttons) when go is not provided', () => {
    render(<ExecutiveOverview branch={'ALL'} />);
    // Without onClick the KPI is not a button — only the Export control is.
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Revenue/i })).toBeNull();
  });
});

describe('New owner dashboards render live', () => {
  test('Cash Forecast shows projected closing from the weekly rows', () => {
    render(<CashForecastDash branch={'ALL'} />);
    expect(screen.getByText('Cash Forecast (13-week)')).toBeInTheDocument();
    expect(screen.getByText(/Projected Closing/i)).toBeInTheDocument();
    // lowest point = W2 closing 500 (below opening 1000)
    expect(screen.getByText(/Lowest Point/i)).toBeInTheDocument();
  });

  test('YoY Growth renders the this-year vs last-year P&L table', () => {
    render(<YoYGrowthDash branch={'ALL'} />);
    expect(screen.getByText('YoY Growth')).toBeInTheDocument();
  });

  test('Customer Value renders LTV totals + ABC split', () => {
    render(<CustomerValueDash branch={'ALL'} />);
    expect(screen.getByText('Customer Value (LTV + ABC)')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  test('Customer Value "Customers" tile drills into the customer master', () => {
    const go = jest.fn();
    render(<CustomerValueDash branch={'ALL'} go={go} />);
    fireEvent.click(screen.getByRole('button', { name: /Customers/i }));
    expect(go).toHaveBeenCalledWith('/masters/customers');
  });

  test('ROW-LEVEL drill: clicking a customer table row navigates to the customer master', () => {
    const go = jest.fn();
    render(<CustomerValueDash branch={'ALL'} go={go} />);
    // The whole row is a drill button — clicking the customer name fires it (event bubbles).
    fireEvent.click(screen.getByText('Acme'));
    expect(go).toHaveBeenCalledWith('/masters/customers');
  });
});

// Regression for the drill-down audit: these dashboards previously received NO `go`
// prop (only a handful did), so none of their amounts were clickable. They must now
// drill into the matching register/report.
describe('Previously drill-dead dashboards now navigate', () => {
  const cases = [
    ['Cash & Liquidity', (go) => <CashLiquidityDash branch={'BOM'} go={go} />, /Cash in Hand/i, '/reports/cash-position'],
    ['Module GP', (go) => <ModuleGpDash branch={'BOM'} go={go} />, /^Sales/i, '/reports/gp'],
    ['Sales & Bookings', (go) => <SalesBookingsDash branch={'BOM'} go={go} />, /Total Sales/i, '/reports/sreg'],
    ['Supplier / Purchase', (go) => <SupplierPurchaseDash branch={'BOM'} go={go} />, /Total Purchases/i, '/reports/preg'],
    ['Expenses', (go) => <ExpensesDash branch={'BOM'} go={go} />, /Total Indirect Expense/i, '/reports/pnl'],
    ['Balance Sheet', (go) => <BalanceSheetDash branch={'BOM'} go={go} />, /Total Assets/i, '/reports/bs'],
    ['Sales vs Target', (go) => <VsTargetDash branch={'BOM'} metric="sales" go={go} />, /Actual/i, '/reports/sreg'],
  ];
  test.each(cases)('%s KPI drills to its report', (_name, renderEl, kpi, route) => {
    const go = jest.fn();
    render(renderEl(go));
    fireEvent.click(screen.getAllByRole('button', { name: kpi })[0]);
    expect(go).toHaveBeenCalledWith(route);
  });

  test('GP vs Target "Actual" drills to the GP report (metric-specific route)', () => {
    const go = jest.fn();
    render(<VsTargetDash branch={'BOM'} metric="gp" go={go} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Actual/i })[0]);
    expect(go).toHaveBeenCalledWith('/reports/gp');
  });
});

// Consolidated "Performance vs Target" — Sales/GP/Budget/Nett Profit on ONE page.
describe('Performance vs Target — consolidated dashboard', () => {
  test('renders all four target tiles under one header', () => {
    render(<PerformanceDash branch={'BOM'} go={jest.fn()} />);
    expect(screen.getByText('Performance vs Target')).toBeInTheDocument();
    expect(screen.getByText('Sales vs Target')).toBeInTheDocument();
    expect(screen.getByText('GP vs Target')).toBeInTheDocument();
    expect(screen.getByText('Budget vs Expense')).toBeInTheDocument();
    expect(screen.getByText('Nett Profit vs Target')).toBeInTheDocument();
  });

  test('each tile drills into its standalone dashboard', () => {
    const go = jest.fn();
    render(<PerformanceDash branch={'BOM'} go={go} />);
    fireEvent.click(screen.getByRole('button', { name: /Sales vs Target/i }));
    expect(go).toHaveBeenCalledWith('/dashboards/sales-target');
    fireEvent.click(screen.getByRole('button', { name: /GP vs Target/i }));
    expect(go).toHaveBeenCalledWith('/dashboards/gp-target');
    fireEvent.click(screen.getByRole('button', { name: /Budget vs Expense/i }));
    expect(go).toHaveBeenCalledWith('/dashboards/budget-expense');
    fireEvent.click(screen.getByRole('button', { name: /Nett Profit vs Target/i }));
    expect(go).toHaveBeenCalledWith('/dashboards/profitability');
  });

  test('warns when no Nett Profit target is set (empty totals)', () => {
    render(<PerformanceDash branch={'BOM'} go={jest.fn()} />);
    expect(screen.getByText(/No Nett Profit target set/i)).toBeInTheDocument();
  });

  test('module table toggles Sales ⇄ GP', () => {
    render(<PerformanceDash branch={'BOM'} go={jest.fn()} />);
    expect(screen.getByText(/Sales vs Target — by Module/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^GP$/ }));
    expect(screen.getByText(/GP vs Target — by Module/i)).toBeInTheDocument();
  });
});

describe('Export / print', () => {
  test('clicking Export fires a kb:print event with the dashboard title', () => {
    const onPrint = jest.fn();
    window.addEventListener('kb:print', onPrint);
    render(<ExecutiveOverview branch={'ALL'} go={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Export/i }));
    expect(onPrint).toHaveBeenCalled();
    const detail = onPrint.mock.calls[0][0].detail;
    expect(detail).toMatchObject({ selector: 'main', title: 'Executive Overview' });
    window.removeEventListener('kb:print', onPrint);
  });
});
