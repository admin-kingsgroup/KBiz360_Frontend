// BranchSplit must never show a false "no data" in ALL/Group scope: it distinguishes
// loading, query error, per-branch compute error (backend `_error` marker), and genuinely
// empty. Driven through CashForecastDash (useCashForecast is a controllable jest.fn).
jest.mock('../../core/useAccounting', () => ({
  useCashForecast: jest.fn(),
  // Other hooks the directorDash module imports — unused by CashForecastDash, kept inert.
  useProfitAndLoss: () => ({ data: {} }), useModulePL: () => ({ data: {} }),
  useBalanceSheet: () => ({ data: {} }), useTrialBalance: () => ({ data: {} }),
  useAgeing: () => ({ data: {} }), useTaxSummary: () => ({ data: {} }),
  useInvoiceGP: () => ({ data: {} }), useVoucherApprovals: () => ({ data: {} }),
  useYearOverYear: () => ({ data: {} }), useBudgetVsActual: () => ({ data: {} }),
  useTargetsVsActual: () => ({ data: {} }), useCustomerLtv: () => ({ data: {} }),
  useAbcAnalysis: () => ({ data: {} }), useInvoiceGp: () => ({ data: {} }),
}));
jest.mock('../../core/period', () => ({ PeriodBar: () => null, periodRange: () => ({ from: '2026-04-01', to: '2026-06-20', label: 'CFY' }) }));
jest.mock('../../core/styles', () => ({ bc: (b) => ({ cur: (b && (b.code || b)) === 'NBO' ? '$' : '₹' }) }));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));

import { render, screen } from '@testing-library/react';
import { useCashForecast } from '../../core/useAccounting';
import { CashForecastDash } from '../directorDashboards';

afterEach(() => jest.clearAllMocks());

describe('BranchSplit — never a false empty in ALL scope', () => {
  test('loading shows a loading state (not the empty message)', () => {
    useCashForecast.mockReturnValue({ isLoading: true, data: undefined });
    render(<CashForecastDash branch={'ALL'} go={jest.fn()} />);
    expect(screen.getByText(/Loading branches/i)).toBeInTheDocument();
    expect(screen.queryByText(/No cash forecast/i)).toBeNull();
  });

  test('query error shows an error state (not the empty message)', () => {
    useCashForecast.mockReturnValue({ isError: true, data: undefined });
    render(<CashForecastDash branch={'ALL'} go={jest.fn()} />);
    expect(screen.getByText(/Couldn.t load this view/i)).toBeInTheDocument();
    expect(screen.queryByText(/No cash forecast/i)).toBeNull();
  });

  test('a per-branch _error marker renders that branch\'s error note, not a blank/₹0 section', () => {
    useCashForecast.mockReturnValue({ data: { byBranch: [
      { branch: 'BOM', opening: 100, rows: [] },
      { branch: 'NBO', _error: 'compute failed' },
    ] } });
    render(<CashForecastDash branch={'ALL'} go={jest.fn()} />);
    expect(screen.getByText('BOM')).toBeInTheDocument();          // healthy branch renders
    expect(screen.getByText('NBO')).toBeInTheDocument();          // failed branch still shown
    expect(screen.getByText(/Couldn.t load NBO/i)).toBeInTheDocument();
  });

  test('genuinely empty (loaded, no branches) shows the empty message', () => {
    useCashForecast.mockReturnValue({ data: { byBranch: [] } });
    render(<CashForecastDash branch={'ALL'} go={jest.fn()} />);
    expect(screen.getByText(/No cash forecast/i)).toBeInTheDocument();
  });
});
