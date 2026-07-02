// SO/PO/GP Approvals — Refund (RF) & Reissue (RI) are reversal modules that live in
// this same queue and now show INLINE in the normal Pending window alongside forward
// bookings. The old "All / Forward / Refund / Reissue" module-filter bar was removed,
// so this locks in: (1) all three module rows render in Pending, (2) no filter group.
// (jest.mock factories may only reference vars prefixed `mock`.)
const mockApiGet = jest.fn();

jest.mock('../../core/api', () => ({
  apiGet: (...a) => mockApiGet(...a),
  apiPost: jest.fn(() => Promise.resolve({})),
  apiPut: jest.fn(() => Promise.resolve({})),
  getAuthToken: jest.fn(() => 'open'),
}));
jest.mock('../../core/ux/confirm', () => ({ confirmDialog: jest.fn(() => Promise.resolve({ confirmed: false })) }));
jest.mock('../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../accountingLive', () => ({ VoucherEditor: () => null }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingApprovals } from '../bookingOrder';

// A pending booking per module: one forward (Flight), one Refund, one Reissue.
const mkRow = (id, bookingNo, module, linkNo) => ({
  id, bookingNo, module, linkNo, status: 'pending', date: '2026-06-25',
  customer: { name: 'Acme Travels' }, supplier: { name: 'Airline' },
  so: { total: 1000 }, po: { total: 800 }, gp: { total: 200 },
});
const ROWS = [
  mkRow('f1', 'BOM/SO/0001', 'FL', 'BOM/0626/SF00001'),
  mkRow('rf1', 'RF/BOM/26/0021', 'RF', 'BOM/0626/SF00677'),
  mkRow('ri1', 'RI/BOM/26/0001', 'RI', 'BOM/0626/SF00700'),
];

beforeEach(() => {
  mockApiGet.mockImplementation((url) => {
    if (url === '/api/booking-orders') return Promise.resolve(ROWS);
    return Promise.resolve([]); // customers, suppliers, edited feed
  });
});
afterEach(() => jest.clearAllMocks());

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

describe('SO/PO/GP Approvals — refund/reissue inline (no module filter)', () => {
  test('forward + refund + reissue all show in the normal Pending window', async () => {
    wrap(<BookingApprovals branch={{ code: 'BOM' }} currentUser={{ role: 'Super Admin' }} />);
    // Refund & reissue rows appear inline alongside the forward booking — no filtering.
    expect(await screen.findByText('RF/BOM/26/0021')).toBeInTheDocument();
    expect(screen.getByText('RI/BOM/26/0001')).toBeInTheDocument();
    expect(screen.getByText('BOM/SO/0001')).toBeInTheDocument();
  });

  test('the All / Forward / Refund / Reissue filter bar is gone', async () => {
    wrap(<BookingApprovals branch={{ code: 'BOM' }} currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('RF/BOM/26/0021'); // wait for data
    expect(screen.queryByRole('group', { name: /Filter by module/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Forward' })).toBeNull();
  });
});
