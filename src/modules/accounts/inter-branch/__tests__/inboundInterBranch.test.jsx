// Inbound Inter-Branch — the BUYER's worklist. THE CONTRACT: a pushed deal is only OFFERED;
// Convert is what accepts it into our books. The button used to be decorative — it navigated
// to /bookings/pending while push() had already seeded the booking, so the deal was in the
// buyer's SO/PO/GP approval queue before they ever opted in. These pin that it now calls the
// convert endpoint, and that the tabs read the LINK's state (not "is the customer blank?").
// (jest.mock factories may only reference vars prefixed `mock`.)
const mockConvert = jest.fn((_b, opts) => opts && opts.onSuccess && opts.onSuccess({ buyerBookingNo: 'BKG/AMD/26/0107', duplicate: false }));
const mockDelete = jest.fn();
const mockInbound = jest.fn();
const mockConfirm = jest.fn(() => Promise.resolve({ confirmed: true }));
const mockToast = jest.fn();
const mockSetRoute = jest.fn();

// The screen pulls `bc` from core/styles.jsx, whose chain reaches core/api.js and its
// `import.meta` — which Jest can't parse. Stub the api module (the screen never calls it
// directly; every fetch goes through the mocked hooks below).
jest.mock('../../../../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../../../../core/useInterBranchVoucher', () => ({
  useInbInbound: (...a) => mockInbound(...a),
  useConvertInb: () => ({ mutate: (...a) => mockConvert(...a), isPending: false }),
  useDeleteInbDeal: () => ({ mutate: (...a) => mockDelete(...a), isPending: false }),
}));
jest.mock('../../../../core/ux/confirm', () => ({ confirmDialog: (...a) => mockConfirm(...a) }));
jest.mock('../../../../core/ux/toast', () => ({ toast: (...a) => mockToast(...a) }));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InboundInterBranch } from '../inboundInterBranch';

const ROW = {
  inbLinkNo: 'INB/BOM-AMD/26/0227', fromBranch: 'BOM', toBranch: 'AMD', date: '2026-07-06',
  passenger: 'TEST PAX', fares: 5427, serviceFee: 10, taxAmt: 1.8, total: 5438.8,
  fx: null, buyerBookingNo: '', buyerStatus: '', saleDone: false, state: 'pending',
};
const feed = (rows) => mockInbound.mockReturnValue({
  isLoading: false,
  data: {
    rows,
    totals: {
      total: rows.length,
      pending: rows.filter((r) => r.state === 'pending').length,
      converted: rows.filter((r) => r.state === 'converted').length,
    },
  },
});

beforeEach(() => { jest.clearAllMocks(); });

test('Convert CALLS the convert endpoint — it does not just navigate', async () => {
  feed([ROW]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{ role: 'Accountant' }} />);
  fireEvent.click(screen.getByText('Convert →'));
  await waitFor(() => expect(mockConvert).toHaveBeenCalled());
  // The deal is addressed by its Link No — this is what creates the buyer's SO/PO/GP.
  expect(mockConvert.mock.calls[0][0]).toEqual({ linkNo: 'INB/BOM-AMD/26/0227' });
  // The old behaviour: a bare route change with no conversion. Must not be the whole action.
  expect(mockSetRoute).not.toHaveBeenCalled();
});

test('Convert is confirmed first — it is the buyer point of no return', async () => {
  feed([ROW]);
  mockConfirm.mockResolvedValueOnce({ confirmed: false });
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  fireEvent.click(screen.getByText('Convert →'));
  await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
  expect(mockConvert).not.toHaveBeenCalled();
});

// state comes from the LINK ('open' → pending, 'booked' → converted), computed on the server.
// A converted row shows its booking no, never a Convert button.
test('a CONVERTED row shows its booking, not a Convert button', () => {
  feed([{ ...ROW, state: 'converted', buyerBookingNo: 'BKG/AMD/26/0107', buyerStatus: 'pending', saleDone: true }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  fireEvent.click(screen.getByText(/Converted/));
  expect(screen.getByText('BKG/AMD/26/0107')).toBeInTheDocument();
  expect(screen.queryByText('Convert →')).not.toBeInTheDocument();
});

// Converted but the client sale isn't filled → the booking can't be approved. Surface it
// rather than let it sit silently in the buyer's queue.
test('a converted row whose sale is unfilled offers "Add sale"', () => {
  feed([{ ...ROW, state: 'converted', buyerBookingNo: 'BKG/AMD/26/0107', saleDone: false }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  fireEvent.click(screen.getByText(/Converted/));
  fireEvent.click(screen.getByText('Add sale →'));
  expect(mockSetRoute).toHaveBeenCalledWith('/bookings/pending');
});

test('tab counts come from the server totals', () => {
  feed([ROW, { ...ROW, inbLinkNo: 'INB/BOM-AMD/26/0228', state: 'converted', buyerBookingNo: 'BKG/AMD/26/0108' }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  expect(screen.getByText(/Pending Conversion/).textContent).toContain('(1)');
  expect(screen.getByText(/^Converted/).textContent).toContain('(1)');
});

// ─── An EMPTY screen must explain itself, not look broken ─────────────────────────────
// Reported live: "INB Incoming screen not available in BOM and AMD". It WAS available —
// BOM has genuinely never been sold to, and AMD's only deal was already converted while the
// screen always opened on the empty Pending tab. Both read as a fault. 305 of 306 live
// deals are `unpushed` (never offered), which is the Convert gate working — but nothing on
// screen said so.
test('lands on Converted when Pending is empty but Converted has rows', async () => {
  feed([{ ...ROW, state: 'converted', buyerBookingNo: 'BKG/AMD/26/0107', saleDone: true }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  // Without the steer this showed "Nothing awaiting conversion" with the row one click away.
  await waitFor(() => expect(screen.getByText('BKG/AMD/26/0107')).toBeInTheDocument());
});

test('stays on Pending when Pending has rows (the steer must not fight real work)', async () => {
  feed([ROW, { ...ROW, inbLinkNo: 'INB/BOM-AMD/26/0228', state: 'converted', buyerBookingNo: 'BKG/AMD/26/0108' }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  await waitFor(() => expect(screen.getByText('Convert →')).toBeInTheDocument());
});

test('an empty Pending tab explains that the seller must Push first', () => {
  feed([]);
  render(<InboundInterBranch branch="BOM" setRoute={mockSetRoute} currentUser={{}} />);
  expect(screen.getByText('Nothing awaiting conversion.')).toBeInTheDocument();
  // The WHY is the whole point — a bare "nothing here" is what read as broken. 305 of 306
  // live deals are unpushed, so this is the message almost every branch sees today.
  expect(screen.getByText(/approves and Pushes/i)).toBeInTheDocument();
});

test('an empty Pending tab points at the Converted tab when rows are hiding there', () => {
  // Belt and braces with the auto-steer: if a user clicks back to Pending and it is empty
  // while Converted has rows, say so rather than leave them staring at nothing.
  feed([{ ...ROW, state: 'converted', buyerBookingNo: 'BKG/AMD/26/0107' }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  fireEvent.click(screen.getByText(/Pending Conversion/));
  expect(screen.getByText(/already converted/i)).toBeInTheDocument();
});
