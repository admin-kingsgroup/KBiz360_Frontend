// The buyer-side of a pushed inter-branch (INB) deal lands in the SO/PO/GP pending queue
// as an auto-seeded booking (cost pre-filled, supplier = "Travkings … <seller>", customer +
// onward sale blank). It must carry a "⇄ INB" badge so the buyer recognises it as an
// inter-branch deal to complete — and a normal booking must NOT.
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

const ROWS = [
  // Buyer-side INB seed: Travkings supplier, blank customer, cost pre-filled, sale blank.
  { id: 'inb1', bookingNo: 'BKG/AMD/26/0009', module: 'SF', linkNo: 'INB/BOM-AMD/26/0003',
    status: 'pending', date: '2026-06-25', customer: { name: '' },
    supplier: { name: 'Travkings Tours and Travels BOM' }, so: { total: 0 }, po: { total: 30551 }, gp: { total: 0 } },
  // Ordinary forward booking — no badge.
  { id: 'f1', bookingNo: 'BKG/AMD/26/0010', module: 'SF', linkNo: 'AMD/0626/SF00001',
    status: 'pending', date: '2026-06-25', customer: { name: 'Acme Travels' },
    supplier: { name: 'Airline X' }, so: { total: 1000 }, po: { total: 800 }, gp: { total: 200 } },
];

beforeEach(() => {
  mockApiGet.mockImplementation((url) => (url === '/api/booking-orders' ? Promise.resolve(ROWS) : Promise.resolve([])));
});
afterEach(() => jest.clearAllMocks());

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

describe('SO/PO/GP Approvals — INB buyer-seed badge', () => {
  test('the Travkings-supplier (buyer-side INB) booking shows exactly one "⇄ INB" badge', async () => {
    wrap(<BookingApprovals branch={{ code: 'AMD' }} currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('BKG/AMD/26/0009');           // rows loaded
    const badges = screen.getAllByText('⇄ INB');
    expect(badges).toHaveLength(1);                        // only the buyer-side INB row
    // and the ordinary booking is present but un-badged
    expect(screen.getByText('BKG/AMD/26/0010')).toBeInTheDocument();
  });
});
