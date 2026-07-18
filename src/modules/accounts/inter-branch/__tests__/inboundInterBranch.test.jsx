// Inbound Inter-Branch — the BUYER's worklist. THE CONTRACT: a pushed deal is only OFFERED;
// Convert is what accepts it into our books. The button used to be decorative — it navigated
// to /bookings/pending while push() had already seeded the booking, so the deal was in the
// buyer's SO/PO/GP approval queue before they ever opted in. These pin that it now calls the
// convert endpoint, and that the tabs read the LINK's state (not "is the customer blank?").
// (jest.mock factories may only reference vars prefixed `mock`.)
const mockConvert = jest.fn((_b, opts) => opts && opts.onSuccess && opts.onSuccess({ buyerBookingNo: 'BKG/AMD/26/0107', duplicate: false }));
const mockDelete = jest.fn();
const mockInbound = jest.fn();
const mockReturn = jest.fn();
const mockConfirm = jest.fn(() => Promise.resolve({ confirmed: true, reason: 'Base fare is short' }));
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
  useReturnInb: () => ({ mutate: (...a) => mockReturn(...a), isPending: false }),
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
      approved: rows.filter((r) => r.state === 'approved').length,
      deleted: rows.filter((r) => r.state === 'deleted').length,
      edited: rows.filter((r) => r.edited).length,
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
  fireEvent.click(screen.getByRole('tab', { name: /^Converted/ }));
  expect(screen.getByText('BKG/AMD/26/0107')).toBeInTheDocument();
  expect(screen.queryByText('Convert →')).not.toBeInTheDocument();
});

// Converted but the client sale isn't filled → the booking can't be approved. Surface it
// rather than let it sit silently in the buyer's queue.
test('a converted row whose sale is unfilled offers "Add sale"', () => {
  feed([{ ...ROW, state: 'converted', buyerBookingNo: 'BKG/AMD/26/0107', saleDone: false }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  fireEvent.click(screen.getByRole('tab', { name: /^Converted/ }));
  fireEvent.click(screen.getByText('Add sale →'));
  expect(mockSetRoute).toHaveBeenCalledWith('/bookings/pending');
});

test('tab counts come from the server totals', () => {
  feed([ROW, { ...ROW, inbLinkNo: 'INB/BOM-AMD/26/0228', state: 'converted', buyerBookingNo: 'BKG/AMD/26/0108' }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  expect(screen.getByRole('tab', { name: /^Pending/ }).textContent).toContain('(1)');
  expect(screen.getByRole('tab', { name: /^Converted/ }).textContent).toContain('(1)');
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
  fireEvent.click(screen.getByRole('tab', { name: /^Pending/ }));
  expect(screen.getByText(/already converted/i)).toBeInTheDocument();
});

// ─── The buyer-side lifecycle: Pending → Converted → Approved & Locked ────────────────
// Owner's model. "Approved & Locked" = OUR SO/PO/GP is approved and its JV is passed in the
// receiving branch's books — the deal is live on both sides and immutable from then on.
// Converted is NOT that: a converted booking is a draft, so nothing is in our books yet.
// The distinction is the whole point — it is the line between reversible and not.
test('Approved & Locked is its own tab, separate from Converted', () => {
  feed([
    { ...ROW, inbLinkNo: 'INB/BOM-AMD/26/0300', state: 'converted', buyerBookingNo: 'BKG/AMD/26/0107' },
    { ...ROW, inbLinkNo: 'INB/BOM-AMD/26/0301', state: 'approved', buyerBookingNo: 'BKG/AMD/26/0108', saleDone: true },
  ]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  fireEvent.click(screen.getByRole('tab', { name: /^Converted/ }));
  expect(screen.getByText('BKG/AMD/26/0107')).toBeInTheDocument();
  expect(screen.queryByText('BKG/AMD/26/0108')).toBeNull();

  fireEvent.click(screen.getByRole('tab', { name: /Approved & Locked/ }));
  expect(screen.getByText('BKG/AMD/26/0108')).toBeInTheDocument();
  expect(screen.getByText(/JV passed/i)).toBeInTheDocument();
  expect(screen.queryByText('BKG/AMD/26/0107')).toBeNull();
});

test('a deleted deal stays visible for audit and offers no Delete button', () => {
  feed([{ ...ROW, state: 'deleted', buyerBookingNo: 'BKG/AMD/26/0109' }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{ role: 'Super Admin' }} />);
  fireEvent.click(screen.getByRole('tab', { name: /^Deleted/ }));
  expect(screen.getByText('BKG/AMD/26/0109')).toBeInTheDocument();
  // Deleting an already-deleted deal is a control that can only fail — don't offer it.
  expect(screen.queryByText('Delete')).toBeNull();
});

// Edited is a CROSS-CUT, not a bucket — a deal can be Converted AND Edited at once, so it
// must filter on its own flag rather than on `state`.
test('Edited is a cross-cut — a converted deal that was edited shows on BOTH tabs', () => {
  feed([{ ...ROW, state: 'converted', buyerBookingNo: 'BKG/AMD/26/0110', edited: true }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  fireEvent.click(screen.getByRole('tab', { name: /^Converted/ }));
  expect(screen.getByText('BKG/AMD/26/0110')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /^Edited/ }));
  expect(screen.getByText('BKG/AMD/26/0110')).toBeInTheDocument();
});

test('every empty tab explains itself — never a bare "nothing here"', () => {
  feed([]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  fireEvent.click(screen.getByRole('tab', { name: /Approved & Locked/ }));
  expect(screen.getByText(/JV is passed/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /^Deleted/ }));
  expect(screen.getByText(/cascade Delete/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /^Edited/ }));
  expect(screen.getByText(/changed after raising them/i)).toBeInTheDocument();
});

// ─── Revoke INB — the key the BUYER holds ─────────────────────────────────────────────
// A pushed deal is ours; the seller cannot pull it back. To get it corrected we clear our own
// books first (revoke + delete our SO/PO/GP — which is what puts the row back in Pending) and
// then RETURN it. That unlocks the seller's Revoke and freezes our Convert until they re-push.
describe('Revoke INB (return to seller)', () => {
  test('offered on a Pending row and sends the reason — the seller acts on it', async () => {
    feed([ROW]);
    render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
    fireEvent.click(screen.getByText('↩ Revoke INB'));
    await waitFor(() => expect(mockReturn).toHaveBeenCalled());
    expect(mockReturn.mock.calls[0][0]).toEqual({ linkNo: 'INB/BOM-AMD/26/0227', reason: 'Base fare is short' });
  });

  test('the reason is required — confirm is asked before anything is sent', async () => {
    feed([ROW]);
    mockConfirm.mockResolvedValueOnce({ confirmed: false });
    render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
    fireEvent.click(screen.getByText('↩ Revoke INB'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockConfirm.mock.calls[0][0]).toMatchObject({ reasonRequired: true });
    expect(mockReturn).not.toHaveBeenCalled();
  });

  // THE RACE GUARD, on screen. The seller is un-posting these very legs, and the figures shown
  // are the OLD ones we already asked them to change. A live Convert here would 409 at best and
  // book a cost off an un-posted deal at worst — so it is disabled, with the reason visible.
  test('a RETURNED row disables Convert, shows why, and offers no second return', () => {
    feed([{ ...ROW, returned: true, returnedReason: 'Base fare is ₹500 short' }]);
    render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
    expect(screen.getByText('Convert →')).toBeDisabled();
    expect(screen.getByText(/returned to BOM — awaiting their re-push/i)).toBeInTheDocument();
    expect(screen.getByText(/Base fare is ₹500 short/)).toBeInTheDocument();
    expect(screen.queryByText('↩ Revoke INB')).toBeNull();
  });

  test('a re-pushed row says the figures were revised', () => {
    feed([{ ...ROW, rePushed: true, returned: false }]);
    render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
    expect(screen.getByText(/re-pushed · figures revised/i)).toBeInTheDocument();
    expect(screen.getByText('Convert →')).not.toBeDisabled();   // ours to take up again
  });
});

// ─── The auto-steer must never present history as work ────────────────────────────────
// Caught on LIVE data: BOM has zero pending/converted/approved and one DELETED deal, and the
// steer opened the screen straight into the Deleted archive — alarming, and not their work.
// Deleted is history; Edited is a cross-cut whose rows already sit on their real tab. Only
// Pending / Converted / Approved are queues, so only those may be steered to.
test('does NOT steer to Deleted — an archive is not a to-do list', () => {
  feed([{ ...ROW, state: 'deleted', buyerBookingNo: 'BKG/BOM/26/0001' }]);
  render(<InboundInterBranch branch="BOM" setRoute={mockSetRoute} currentUser={{}} />);
  // Stays on Pending, whose empty state explains that a deal appears only once a seller pushes.
  expect(screen.getByText('Nothing awaiting conversion.')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /^Deleted/ }).textContent).toContain('(1)');   // findable
});

test('does NOT steer to Edited — a cross-cut, not a queue', () => {
  // The row is BOTH deleted and edited; neither may pull the user off Pending.
  feed([{ ...ROW, state: 'deleted', edited: true }]);
  render(<InboundInterBranch branch="BOM" setRoute={mockSetRoute} currentUser={{}} />);
  expect(screen.getByText('Nothing awaiting conversion.')).toBeInTheDocument();
});

test('DOES steer to Approved when that is the only real work', () => {
  feed([{ ...ROW, state: 'approved', buyerBookingNo: 'BKG/AMD/26/0108', saleDone: true }]);
  render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
  expect(screen.getByText('BKG/AMD/26/0108')).toBeInTheDocument();
});

// ─── Incoming refunds — the seller reversed a deal and PUSHED the refund to us ─────────
// Our books still carry the original figures until WE raise + approve the matching refund;
// the section is that worklist. Hidden entirely while there are none (refunds are the
// exception, not the daily flow).
describe('Incoming refunds', () => {
  const refundFeed = (refunds) => mockInbound.mockReturnValue({
    isLoading: false,
    data: {
      rows: [], refunds,
      totals: { total: 0, pending: 0, converted: 0, approved: 0, deleted: 0, edited: 0, refunds: refunds.length, refundsAwaiting: refunds.filter((r) => !r.matched).length },
    },
  });
  const RF = {
    vno: 'RF/BOM/26/0025', category: 'refund', date: '2026-04-17', pushedAt: '2026-07-18T05:00:00.000Z',
    inbLinkNo: 'INB/BOM-DAR/26/0195', fromBranch: 'BOM', toBranch: 'DAR',
    amount: 22811, amountInBranch: 22811, ccy: 'USD', buyerBookingNo: 'BKG/DAR/26/0031', matched: false,
  };

  test('an unmatched pushed refund is listed with a "Raise matching refund" action', () => {
    refundFeed([RF]);
    render(<InboundInterBranch branch="DAR" setRoute={mockSetRoute} currentUser={{}} />);
    expect(screen.getByText('Incoming refunds', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('RF/BOM/26/0025')).toBeInTheDocument();
    expect(screen.getByText('INB/BOM-DAR/26/0195')).toBeInTheDocument();
    expect(screen.getByText(/not in your books yet/)).toBeInTheDocument();
    expect(screen.getByText(/1 awaiting your matching refund/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Raise matching refund/ }));
    expect(mockSetRoute).toHaveBeenCalledWith('/bookings/new');
  });

  test('a matched refund shows ✓ and offers no action', () => {
    refundFeed([{ ...RF, matched: true }]);
    render(<InboundInterBranch branch="DAR" setRoute={mockSetRoute} currentUser={{}} />);
    expect(screen.getByText(/matched — refund raised in your books/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Raise matching refund/ })).toBeNull();
  });

  test('the section is hidden when there are no incoming refunds', () => {
    feed([ROW]);
    render(<InboundInterBranch branch="AMD" setRoute={mockSetRoute} currentUser={{}} />);
    expect(screen.queryByText('Incoming refunds', { exact: false })).toBeNull();
  });
});
