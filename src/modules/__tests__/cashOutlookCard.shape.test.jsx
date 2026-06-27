// Regression: the Branch-Accountant "Cash-flow Outlook" card reads the LIVE
// backend shape correctly.
//
// The bug this locks in: /api/accounting/cash-forecast returns an OBJECT
// `{ opening, rows: [...] }` — NOT a bare array. CashOutlookCard used to do
// `(q.data || []).slice(0, 4)`; because the truthy object skipped the `|| []`
// fallback, `.slice` didn't exist on it and the whole Accounts dashboard crashed
// with "(o.data || []).slice is not a function". The weekly series lives in `.rows`.
//
// We mock the useAccounting hook so the component renders against a payload shaped
// exactly like the backend's cashForecast() return.
jest.mock('../../core/useAccounting', () => ({ useCashForecast: jest.fn() }));
// core/api.js uses import.meta (Vite) which jest's CJS transform can't parse, and
// core/styles pulls heavy chart helpers — stub both; CashOutlookCard needs neither.
jest.mock('../../core/api', () => ({
  apiGet: jest.fn(() => Promise.resolve({})), apiPost: jest.fn(), apiDelete: jest.fn(),
  getAuthToken: jest.fn(() => 'open'),
}));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }), card: {} }));

import { render, screen } from '@testing-library/react';
import { useCashForecast } from '../../core/useAccounting';
import { CashOutlookCard } from '../accountantWorkspace';

afterEach(() => jest.clearAllMocks());

// The exact shape accounting.service.cashForecast() returns.
const FORECAST = {
  opening: 100000,
  rows: [
    { week: 'W1', inflow: 50000, outflow: 20000, closing: 130000 },
    { week: 'W2', inflow: 10000, outflow: 40000, closing: 100000 },
    { week: 'W3', inflow: 0, outflow: 0, closing: 100000 },
    { week: 'W4', inflow: 5000, outflow: 0, closing: 105000 },
    { week: 'W5', inflow: 9999, outflow: 0, closing: 114999 }, // beyond the 4-week window
  ],
};

describe('CashOutlookCard — reads { opening, rows } object shape', () => {
  test('renders the first 4 weekly rows without throwing on the object payload', () => {
    useCashForecast.mockReturnValue({ data: FORECAST, isLoading: false });
    render(<CashOutlookCard branch={'BOM'} cur={'₹'} go={() => {}} />);
    // First four weeks shown…
    expect(screen.getByText('W1')).toBeInTheDocument();
    expect(screen.getByText('W4')).toBeInTheDocument();
    // …and the 5th sliced off (only 4 weeks in the card).
    expect(screen.queryByText('W5')).not.toBeInTheDocument();
    // The empty-state row must NOT show when rows exist.
    expect(screen.queryByText(/No upcoming due-dated bills/i)).not.toBeInTheDocument();
  });

  test('shows the loading row while the forecast query is in flight', () => {
    useCashForecast.mockReturnValue({ data: undefined, isLoading: true });
    render(<CashOutlookCard branch={'BOM'} cur={'₹'} go={() => {}} />);
    expect(screen.getByText(/Loading forecast/i)).toBeInTheDocument();
  });

  test('shows the empty state when the forecast has no rows', () => {
    useCashForecast.mockReturnValue({ data: { opening: 0, rows: [] }, isLoading: false });
    render(<CashOutlookCard branch={'BOM'} cur={'₹'} go={() => {}} />);
    expect(screen.getByText(/No upcoming due-dated bills/i)).toBeInTheDocument();
  });

  test('does not crash if the endpoint ever returns no data at all', () => {
    useCashForecast.mockReturnValue({ data: undefined, isLoading: false });
    expect(() =>
      render(<CashOutlookCard branch={'BOM'} cur={'₹'} go={() => {}} />),
    ).not.toThrow();
  });
});
