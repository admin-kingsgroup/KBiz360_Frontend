// INB SPG Approvals tab — the two INB legs (sale + airline purchase) group into ONE
// deal by INB Link No (sourceRef); Pending deals walk the three-level chain (stage lives
// on the sale leg) and final Approve posts BOTH legs via approve-many; an already-posted
// ('saved') deal shows under Approved.
// (jest.mock factories may only reference vars prefixed `mock`.)
const mockApiGet = jest.fn();
const mockEditedGet = jest.fn(() => Promise.resolve([])); // /api/vouchers/edited feed (Edited tab)
const mockApiPost = jest.fn(() => Promise.resolve({}));
const mockApproveMany = jest.fn();
const mockApproveOne = jest.fn(() => Promise.resolve({}));
const mockRejectAsync = jest.fn(() => Promise.resolve());
const mockConfirm = jest.fn(() => Promise.resolve({ confirmed: true, reason: 'x' }));
// The InbLink registry — the ONLY place that knows what the buyer did with a pushed deal.
const mockInbLinks = jest.fn(() => []);

// Route the edited-vouchers feed to its own mock so setting the deals list doesn't
// accidentally populate the Edited tab.
jest.mock('../../core/api', () => ({
  apiGet: (url, ...a) => (url === '/api/vouchers/edited' ? mockEditedGet(url, ...a) : mockApiGet(url, ...a)),
  apiPost: (...a) => mockApiPost(...a),
  getAuthToken: jest.fn(() => 'open'),
}));
jest.mock('../../core/useAccounting', () => ({
  useVoucherApprovals: jest.fn(() => ({ data: {} })),
  useApproveVoucher: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: (...a) => mockApproveOne(...a) })),
  useRejectVoucher: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: (...a) => mockRejectAsync(...a) })),
  useDeleteVoucher: jest.fn(() => ({ mutate: jest.fn() })),
  useRevokeVoucher: jest.fn(() => ({ mutate: jest.fn() })),
  fetchRevokeCheck: jest.fn(),
  useApproveMany: jest.fn(() => ({ mutate: (...a) => mockApproveMany(...a) })),
  useApproveAll: jest.fn(() => ({ mutate: jest.fn() })),
  branchCode: jest.fn(() => 'BOM'),
  // Refund/reissue Amount cells (useRefundLiveAmount) pull the saved voucher + a live
  // preview to mirror the Edit modal; no data needed here, just the two hooks present.
  useVoucher: jest.fn(() => ({ data: null, isLoading: false })),
  useVoucherPreview: jest.fn(() => ({ data: {} })),
}));
jest.mock('../../core/useInterBranchVoucher', () => ({
  useInbDeal: jest.fn(() => ({ data: null, isLoading: false })),
  useInbReconcile: jest.fn(() => ({ data: { links: mockInbLinks() } })),
}));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../../core/data', () => ({ CONSOLIDATED_LABEL: 'TK Head Office Group' }));
jest.mock('../../core/AuditTrail', () => ({ AuditTrail: () => null }));
jest.mock('../../core/voucher/JvBlock', () => ({ JvBlock: () => null }));
jest.mock('../reportsFinancial/pnlTally', () => ({ VoucherView: () => null }));
jest.mock('../accountingLive', () => ({ VoucherEditor: () => null }));
jest.mock('../bookingOrder', () => ({ BookingApprovals: () => null }));
jest.mock('../../core/voucher-print', () => ({ openPrintWindow: jest.fn() }));
jest.mock('../../core/ux/useModalEsc', () => ({ useModalEsc: jest.fn() }));
jest.mock('../../core/ux/confirm', () => ({ confirmDialog: (...a) => mockConfirm(...a) }));
jest.mock('../../core/ux/clickable', () => ({ clickable: (fn) => ({ onClick: fn }) }));
jest.mock('../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../core/ux/FocusBanner', () => ({ FocusBanner: () => null }));
jest.mock('../../core/ux/navFocus', () => ({ useNavFocusStore: jest.fn(() => null) }));
jest.mock('../../shell/primitives', () => ({ SkeletonTable: () => null }));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InbApprovals, UnifiedApprovals } from '../approvals';

// One INB deal = a SALE leg + a PURCHASE leg sharing the same sourceRef (INB Link No).
// Legs are already Checked + Verified so the deal sits at the final Approve stage
// (the chain's stage is derived from the sale leg's checkedBy/verifiedBy).
const LINK = 'INB/BOM-AMD/26/0001';
const mkLegs = (status, pushed = false) => [
  { id: 'sale1', vno: 'INB/BOM/26/0003', category: 'sale', type: 'INB', branch: 'BOM', party: 'Travkings Tours and Travels AMD',
    date: '2026-06-23', sourceRef: LINK, status, pushed, total: 30551, taxAmt: 21.81, costCenter: 'BOM-INB-FLT-INT',
    checkedBy: 'acct', verifiedBy: 'sughra',
    lines: [{ ledger: 'IT-Base Fare [IB]', amt: 25845 }, { ledger: 'IT-SVF [IB]', amt: 121.19 }] },
  { id: 'pur1', vno: 'INB/BOM/26/0004', category: 'purchase', type: 'INB', branch: 'BOM', party: 'TRIP JACK',
    date: '2026-06-23', sourceRef: LINK, status, pushed, total: 29113, taxAmt: 0, costCenter: 'BOM-INB-FLT-INT',
    checkedBy: 'acct', verifiedBy: 'sughra',
    lines: [{ ledger: 'IT-Base Fare [Pur]', amt: 25845 }] },
];

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};
beforeEach(() => {
  // The chain reads the signed-in user from localStorage; Super Admin overrides L2/L3.
  localStorage.setItem('kb360-user', JSON.stringify({ email: 'admin@travkings.com', role: 'Super Admin' }));
});
afterEach(() => { localStorage.removeItem('kb360-user'); jest.clearAllMocks(); });

describe('INB SPG Approvals', () => {
  test('groups the two legs into ONE pending deal row under the INB Link No', async () => {
    mockApiGet.mockResolvedValue(mkLegs('pending'));
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText(LINK, { exact: false })).toBeInTheDocument();
    expect(mockApiGet).toHaveBeenCalledWith('/api/vouchers', { type: 'INB', branch: 'BOM' });
    expect(screen.getByText('BOM → AMD', { exact: false })).toBeInTheDocument();
    // one deal → one Approve button, and both leg vnos appear as Sale Inv / Purchase Inv
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1);
    expect(screen.getByText('INB/BOM/26/0003')).toBeInTheDocument();
    expect(screen.getByText('INB/BOM/26/0004')).toBeInTheDocument();
  });

  test('Approve posts BOTH legs via approve-many (sale + purchase ids), grouped per deal for atomicity', async () => {
    mockApiGet.mockResolvedValue(mkLegs('pending'));
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(mockApproveMany).toHaveBeenCalled());
    const arg = mockApproveMany.mock.calls[0][0];
    expect(arg.ids.sort()).toEqual(['pur1', 'sale1']);
    // The deal's legs travel as ONE group → the backend posts them all-or-nothing
    // (a refused purchase leg rolls the sale leg back; the deal stays Pending).
    expect(arg.groups).toEqual([['sale1', 'pur1']]);
  });

  // Regression: a HALF-approved deal (sale posted, purchase still pending — e.g. an old
  // non-atomic bulk approve died on "Tax ledger(s) not in Chart of Accounts") must
  // surface under PENDING so it can be fixed and re-approved — NOT under Approved.
  test('a half-approved deal (sale approved, purchase pending) stays in the Pending tab', async () => {
    const legs = mkLegs('pending');
    legs.find((l) => l.category === 'sale').status = 'approved';
    mockApiGet.mockResolvedValue(legs);
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    // It renders on the (default) Pending tab, still actionable…
    expect(await screen.findByText(LINK, { exact: false })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1);
    // …and re-approving sends ONLY the still-pending purchase leg (its own group).
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(mockApproveMany).toHaveBeenCalled());
    expect(mockApproveMany.mock.calls[0][0].groups).toEqual([['pur1']]);
  });

  test('historical folded legs pair via againstPurchase even when sourceRef differs', async () => {
    // Real post-migration shape: legs keep their ORIGINAL Tally sourceRefs (DS/01 vs
    // DP/01) — only the sale's againstPurchase links them. Must still be ONE deal.
    const legs = mkLegs('saved').map((l) => ({ ...l, sourceRef: l.category === 'sale' ? 'DS/01' : 'DP/01' }));
    legs.find((l) => l.category === 'sale').againstPurchase = 'INB/BOM/26/0004';
    mockApiGet.mockResolvedValue(legs);
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Approved/ }));
    // ONE deal row → both legs paired (Sale Inv + Purchase Inv on the same row)
    expect(screen.getByText('INB/BOM/26/0003')).toBeInTheDocument();   // Sale Inv cell (exact; link cell has "▸ " prefix)
    expect(screen.getByText('INB/BOM/26/0004')).toBeInTheDocument();   // Purchase Inv cell
    // exactly one From→To cell ⇒ not split into two rows
    expect(screen.getAllByText('BOM → AMD', { exact: false })).toHaveLength(1);
  });

  // Approve POSTS to our books → the deal is in the APPROVED tab (not Pending), still
  // revocable, exposing a Push action. Approve is gone from that tab (already approved).
  test('an approved (not-yet-pushed) deal shows under Approved with Push, not Pending', async () => {
    mockApiGet.mockResolvedValue(mkLegs('approved', false));
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText('No pending INB deals.', { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Approved/ }));   // the "Approved" tab (not "Pushed")
    expect(screen.getByText(LINK, { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull(); // already approved
    const pushBtn = screen.getByRole('button', { name: /Push$/ });        // row "⇪ Push"
    fireEvent.click(pushBtn);
    await waitFor(() => expect(mockApiPost).toHaveBeenCalledWith('/api/inter-branch/push', { linkNo: LINK }));
  });

  // A PUSHED deal is locked: it lives in the Pushed tab, read-only — no Push, no Revoke.
  test('a pushed deal shows in the Pushed tab, locked (no Push/Revoke)', async () => {
    mockApiGet.mockResolvedValue(mkLegs('approved', true));
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Pushed/ })); // the "Pushed" tab
    expect(screen.getByText(LINK, { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Push$/ })).toBeNull();      // locked
    expect(screen.queryByRole('button', { name: /Revoke/ })).toBeNull();     // locked
  });

  // The Edited tab is a cross-cut fed by /api/vouchers/edited, filtered to type INB.
  test('the Edited tab lists INB legs edited ≥ once (from the edited feed)', async () => {
    mockApiGet.mockResolvedValue([]); // no deals — isolate the Edited tab
    mockEditedGet.mockResolvedValue([
      { id: 'sale1', vno: 'INB/BOM/26/0003', type: 'INB', party: 'Travkings Tours and Travels AMD', total: 30551, status: 'unpushed', edits: 2, lastBy: 'afshin', lastAt: '2026-07-02', lastReason: 'fixed fare' },
      { id: 'x9', vno: 'JV/BOM/26/0009', type: 'JV', party: 'Something', total: 100, status: 'approved', edits: 1, lastBy: 'x', lastAt: '2026-07-01', lastReason: 'n/a' }, // non-INB → filtered out
    ]);
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Edited/ }));
    expect(await screen.findByText('INB/BOM/26/0003')).toBeInTheDocument();
    expect(screen.getByText('fixed fare')).toBeInTheDocument();
    expect(screen.queryByText('JV/BOM/26/0009')).toBeNull();   // non-INB excluded
  });

  // INB refunds (RF/RI reversing an INB deal) are routed to THIS pipeline and render in
  // their own section, fetched via useVoucherApprovals scoped to refundScope:'inb'.
  test('INB refunds show in their own section and approve as a single voucher', async () => {
    const { useVoucherApprovals } = require('../../core/useAccounting');
    useVoucherApprovals.mockReturnValue({ isLoading: false, data: { entries: [
      { id: 'rf1', vno: 'RF/BOM/26/0052', category: 'refund', inb: true, againstInvoice: 'INB/BOM/26/0069',
        party: 'Travkings Tours and Travels AMD', total: 53558, status: 'pending', postable: true, errors: [], warnings: [],
        checkedBy: 'acct', verifiedBy: 'sughra', reviewStage: 'approve' },
    ] } });
    mockApiGet.mockResolvedValue([]); // no INB sale/purchase deals — isolate the refunds section
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);

    expect(await screen.findByText('RF/BOM/26/0052')).toBeInTheDocument();
    expect(screen.getByText('INB Refunds & Reissues', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('INB/BOM/26/0069')).toBeInTheDocument();          // the deal it reverses
    // it verifies the SO/PO/GP queue is asked to EXCLUDE these (refundScope split)
    expect(useVoucherApprovals).toHaveBeenCalledWith('BOM', 'pending', { refundScope: 'inb' });

    // Checked + Verified → the final chain action posts the SINGLE voucher (real errors surface).
    fireEvent.click(screen.getByRole('button', { name: 'Approve & Post' }));
    await waitFor(() => expect(mockApproveOne).toHaveBeenCalled());
    expect(mockApproveOne.mock.calls[0][0]).toMatchObject({ id: 'rf1' });
    useVoucherApprovals.mockReturnValue({ data: {} }); // restore default for any later test
  });
});

// ─── INB must stay reachable from the Approvals toggle ────────────────────────────────
// REGRESSION GUARD. An outgoing INB deal IS an approval queue, so an approver doing their
// Approvals round has to find it on this pill. Giving INB its own pipeline screens
// (Inter Branch ▸ Outgoing / Incoming) is right — but it is an ADDITIONAL door, not a
// replacement: removing the segment here once made INB invisible to exactly the person
// who has to action it, with no error and nothing in the UI to say where it went.
// Same InbApprovals component either way — two doors, one queue, no duplicated logic.
describe('INB is reachable from the Approvals toggle', () => {
  test('the INB segment is rendered alongside SO / PO / GP', () => {
    mockApiGet.mockResolvedValue([]);
    wrap(<UnifiedApprovals branch="BOM" setRoute={jest.fn()} currentUser={{ role: 'Super Admin' }} />);
    expect(screen.getByRole('button', { name: 'INB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SO / PO / GP' })).toBeInTheDocument();
  });

  test('opening the shell on the INB domain lands on the INB queue, not SO/PO/GP', async () => {
    mockApiGet.mockResolvedValue(mkLegs('pending'));
    wrap(<UnifiedApprovals branch="BOM" setRoute={jest.fn()} currentUser={{ role: 'Super Admin' }} initialDomain="inbspg" />);
    // The INB queue asks for INB vouchers; BookingApprovals is mocked to null, so seeing
    // the deal's link no proves we rendered InbApprovals and not the SO/PO/GP queue.
    expect(await screen.findByText(LINK, { exact: false })).toBeInTheDocument();
    expect(mockApiGet).toHaveBeenCalledWith('/api/vouchers', { type: 'INB', branch: 'BOM' });
  });
});

// ─── A pushed deal must say what the BUYER did with it ───────────────────────────────
// "Don't leave a screen silent." A pushed row showed "🔒 pushed" and nothing else — we hand
// the deal over and never learn whether it was taken up, so 290 pushed deals would be an
// unreadable pile. The voucher legs only know they were pushed; the InbLink registry is the
// only place that knows the buyer's side, so the screen joins the two.
describe('a pushed deal reports the buyer side', () => {
  test('offered but not yet accepted → "awaiting <buyer> convert"', async () => {
    mockInbLinks.mockReturnValue([{ inbLinkNo: LINK, saleVno: 'INB/BOM/26/0003', status: 'open', buyerBookingNo: '' }]);
    mockApiGet.mockResolvedValue(mkLegs('approved', true));
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Pushed/ }));
    expect(screen.getByText(/awaiting AMD convert/i)).toBeInTheDocument();
  });

  test('accepted → "converted" with the buyer booking no', async () => {
    mockInbLinks.mockReturnValue([{ inbLinkNo: LINK, saleVno: 'INB/BOM/26/0003', status: 'booked', buyerBookingNo: 'BKG/AMD/26/0107' }]);
    mockApiGet.mockResolvedValue(mkLegs('approved', true));
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Pushed/ }));
    expect(screen.getByText(/converted · BKG\/AMD\/26\/0107/i)).toBeInTheDocument();
  });

  // Folded/migrated deals display their SALE VNO as the link no (their per-leg sourceRefs are
  // Tally refs, not the INB link), so the join must resolve on that key too or every migrated
  // deal silently loses its buyer state.
  test('joins on the sale vno for a folded deal whose link no is not the INB link', async () => {
    mockInbLinks.mockReturnValue([{ inbLinkNo: 'INB/BOM-AMD/26/9999', saleVno: 'INB/BOM/26/0003', status: 'booked', buyerBookingNo: 'BKG/AMD/26/0200' }]);
    const legs = mkLegs('approved', true).map((l) => ({ ...l, sourceRef: 'IS/77/26-27' })); // Tally refs → deal keys on the sale vno
    legs[0].againstPurchase = 'INB/BOM/26/0004';
    mockApiGet.mockResolvedValue(legs);
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Pushed/ }));
    expect(screen.getByText(/converted · BKG\/AMD\/26\/0200/i)).toBeInTheDocument();
  });

  test('no registry row → no badge, and nothing breaks', async () => {
    mockInbLinks.mockReturnValue([]);
    mockApiGet.mockResolvedValue(mkLegs('approved', true));
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Pushed/ }));
    expect(screen.getByText(LINK, { exact: false })).toBeInTheDocument();
    // Match the BADGES specifically — the screen's help text legitimately explains Convert,
    // so a loose /convert/ here would match the prose and never fail.
    expect(screen.queryByText(/awaiting AMD convert/i)).toBeNull();
    expect(screen.queryByText(/converted · BKG/i)).toBeNull();
  });
});
