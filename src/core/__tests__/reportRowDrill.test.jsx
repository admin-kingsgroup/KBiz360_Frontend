// Row-level drill on the analytics RPT_ reports: clicking a customer/supplier row
// deep-links into that entity's 360° view via ?party= (the router matches on pathname,
// so the query rides along and the 360 page reads it at mount).
jest.mock('../api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../useAccounting', () => ({
  useCustomerLtv: jest.fn(() => ({
    data: { rows: [{ name: 'Acme Corp', firstBooking: '2026-01', lastBooking: '2026-06', totalBookings: 3, ltv: 600, avgBasket: 200, monthsActive: 6, recencyDays: 10 }] },
    isLoading: false, isError: false,
  })),
  // other hooks used elsewhere in styles.jsx — never called by RPT_CustomerLTV.
  useGpBills: jest.fn(() => ({ data: [] })),
  useProfitAndLoss: jest.fn(() => ({ data: {} })),
  useYieldByDestination: jest.fn(() => ({ data: {} })),
  useAbcAnalysis: jest.fn(() => ({ data: {} })),
  useYearOverYear: jest.fn(() => ({ data: {} })),
  useFxExposure: jest.fn(() => ({ data: {} })),
  useTrialBalance: jest.fn(() => ({ data: {} })),
  useAuditTrail: jest.fn(() => ({ data: [] })),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { RPT_CustomerLTV } from '../styles';

describe('RPT_CustomerLTV — row drill into Customer 360', () => {
  test('clicking a customer row navigates to /reports/customer-360?party=<name>', () => {
    const setRoute = jest.fn();
    render(<RPT_CustomerLTV branch={{ code: 'BOM' }} setRoute={setRoute} />);
    // The whole row is a keyboard-accessible drill button; clicking the name fires it.
    fireEvent.click(screen.getByText('Acme Corp'));
    expect(setRoute).toHaveBeenCalledWith('/reports/customer-360?party=Acme%20Corp');
  });

  test('is inert (no crash, no navigation) when setRoute is not provided', () => {
    render(<RPT_CustomerLTV branch={{ code: 'BOM' }} />);
    fireEvent.click(screen.getByText('Acme Corp')); // must not throw
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });
});
