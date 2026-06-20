// Director suite: KPI tiles drill into the matching report, and every dashboard
// has an Export control that fires the app-wide `kb:print` event.
jest.mock('../../core/useAccounting', () => ({
  useProfitAndLoss: jest.fn(() => ({ data: {} })),
  useModulePL: jest.fn(() => ({ data: { totals: { sales: 100, gp: 30, gpPct: 30 } } })),
  useBalanceSheet: jest.fn(() => ({ data: {} })),
  useAgeing: jest.fn(() => ({ data: {} })),
  useInvoiceGP: jest.fn(() => ({ data: {} })),
  useTaxSummary: jest.fn(() => ({ data: { output: { total: 50 }, input: { total: 20 }, netPayable: 30 } })),
  useTrialBalance: jest.fn(() => ({ data: {} })),
  useVoucherApprovals: jest.fn(() => ({ data: {} })),
  useYearOverYear: jest.fn(() => ({ data: {} })),
  useBudgetVsActual: jest.fn(() => ({ data: {} })),
  useTargetsVsActual: jest.fn(() => ({ data: {} })),
  useSalesTargets: jest.fn(() => ({ data: [] })),
  useSaveTargets: jest.fn(() => ({ mutate: jest.fn() })),
}));
jest.mock('../../core/period', () => ({
  PeriodBar: () => null,
  periodRange: () => ({ from: '2026-04-01', to: '2026-06-20', label: 'CFY' }),
}));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));

import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutiveOverview, TaxComplianceDash } from '../directorDashboards';

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
