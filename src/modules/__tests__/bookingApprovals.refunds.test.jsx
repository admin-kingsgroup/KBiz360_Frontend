// SO/PO/GP Approvals now MERGES refund/reissue vouchers into the same window: below the
// bookings table, a "Refunds & Reissues" section lists RF/RI vouchers (category
// refund/reissue) fetched via useVoucherApprovals(..., { refundScope: 'sopogp' }) — which
// excludes INB refunds (they live in the INB window). Each is a single voucher that walks
// the three-level chain (Check → Verify → Approve & Post) and is approved/rejected via
// the shared voucher mutations. This locks that wiring.
// (jest.mock factories may only reference vars prefixed `mock`.)
const mockApiGet = jest.fn();
const mockApiPost = jest.fn(() => Promise.resolve({}));
const mockApproveOne = jest.fn(() => Promise.resolve({}));
const mockRejectAsync = jest.fn(() => Promise.resolve());
const mockConfirm = jest.fn(() => Promise.resolve({ confirmed: true, reason: 'wrong fare' }));

jest.mock('../../core/api', () => ({
  isViewOnly: () => false,
  VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.',
  apiGet: (...a) => mockApiGet(...a),
  apiPost: (...a) => mockApiPost(...a),
  apiPut: jest.fn(() => Promise.resolve({})),
  getAuthToken: jest.fn(() => 'open'),
}));
jest.mock('../../core/ux/confirm', () => ({ confirmDialog: (...a) => mockConfirm(...a) }));
jest.mock('../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../accountingLive', () => ({ VoucherEditor: ({ voucherId }) => <div data-testid="voucher-editor">editing {voucherId}</div> }));
// Keep the real module (invalidateBooks, branchCode, …) but stub the approval hooks.
jest.mock('../../core/useAccounting', () => {
  const actual = jest.requireActual('../../core/useAccounting');
  return {
    ...actual,
    useVoucherApprovals: jest.fn(),
    useApproveVoucher: jest.fn(() => ({ mutateAsync: (...a) => mockApproveOne(...a), isPending: false })),
    useRejectVoucher: jest.fn(() => ({ mutateAsync: mockRejectAsync, isPending: false })),
  };
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingApprovals } from '../bookingOrder';
import { useVoucherApprovals } from '../../core/useAccounting';

// Two SO/PO/GP-path refund vouchers (againstInvoice is a booking sale invoice, NOT INB/…),
// already Checked + Verified so the final Approve & Post button is the next action.
const ENTRIES = [
  { id: 'rf1', vno: 'RF/BOM/26/0021', category: 'refund', party: 'Acme Travels', againstInvoice: 'BOM/0626/SF00677', total: 5000, status: 'pending', postable: true, checkedBy: 'acct', verifiedBy: 'sughra', reviewStage: 'approve' },
  { id: 'ri1', vno: 'RI/BOM/26/0001', category: 'reissue', party: 'Beta Co', againstInvoice: 'BOM/0626/SF00700', total: 1200, status: 'pending', postable: true, checkedBy: 'acct', verifiedBy: 'sughra', reviewStage: 'approve' },
];

beforeEach(() => {
  mockApiGet.mockImplementation(() => Promise.resolve([])); // no bookings / customers / suppliers
  useVoucherApprovals.mockReturnValue({ isLoading: false, data: { entries: ENTRIES } });
  // The chain reads the signed-in user from localStorage (email → L2/L3 eligibility,
  // role → Super Admin override). Default each test to a Super Admin.
  localStorage.setItem('kb360-user', JSON.stringify({ email: 'admin@travkings.com', role: 'Super Admin' }));
});
afterEach(() => { localStorage.removeItem('kb360-user'); jest.clearAllMocks(); });

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

describe('SO/PO/GP Approvals — merged Refunds & Reissues section', () => {
  test('lists sopogp refund/reissue vouchers in the window and requests refundScope=sopogp', async () => {
    wrap(<BookingApprovals branch={{ code: 'BOM' }} currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText('RF/BOM/26/0021')).toBeInTheDocument();
    expect(screen.getByText('RI/BOM/26/0001')).toBeInTheDocument();
    expect(screen.getByText('Refunds & Reissues', { exact: false })).toBeInTheDocument();
    // The FE contract: this window asks the backend to EXCLUDE INB refunds.
    expect(useVoucherApprovals).toHaveBeenCalledWith({ code: 'BOM' }, 'pending', { refundScope: 'sopogp' });
  });

  test('final Approve & Post approves the single refund voucher by id (surfacing real errors)', async () => {
    wrap(<BookingApprovals branch={{ code: 'BOM' }} currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('RF/BOM/26/0021');
    fireEvent.click(screen.getAllByRole('button', { name: 'Approve & Post' })[0]);
    await waitFor(() => expect(mockApproveOne).toHaveBeenCalled());
    expect(mockApproveOne.mock.calls[0][0]).toMatchObject({ id: 'rf1' });
  });

  test('an unchecked refund offers Check (level 1) and posts the review action', async () => {
    useVoucherApprovals.mockReturnValue({ isLoading: false, data: { entries: [
      { ...ENTRIES[0], checkedBy: '', verifiedBy: '', reviewStage: 'check' },
    ] } });
    wrap(<BookingApprovals branch={{ code: 'BOM' }} currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('RF/BOM/26/0021');
    fireEvent.click(screen.getAllByRole('button', { name: 'Check' })[0]);
    await waitFor(() => expect(mockApiPost).toHaveBeenCalledWith('/api/vouchers/rf1/review', { action: 'check' }));
  });

  test('Reject sends the voucher id + reason to the reject mutation', async () => {
    wrap(<BookingApprovals branch={{ code: 'BOM' }} currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('RF/BOM/26/0021');
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject' })[0]);
    await waitFor(() => expect(mockRejectAsync).toHaveBeenCalled());
    expect(mockRejectAsync.mock.calls[0][0]).toMatchObject({ id: 'rf1', reason: 'wrong fare' });
  });

  test('Edit opens the shared voucher editor so a blocked refund can be fixed inline', async () => {
    wrap(<BookingApprovals branch={{ code: 'BOM' }} currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('RF/BOM/26/0021');
    fireEvent.click(screen.getAllByRole('button', { name: /✎ Edit/ })[0]); // refund row Edit (not the "Edited" tab)
    expect(await screen.findByTestId('voucher-editor')).toHaveTextContent('editing rf1');
  });

  test('a non-approver gets no Edit/Reject and a disabled final Approve & Post', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ email: 'exec@travkings.com', role: 'Accounts Executive' }));
    wrap(<BookingApprovals branch={{ code: 'BOM' }} currentUser={{ role: 'Accounts Executive' }} />);
    await screen.findByText('RF/BOM/26/0021');
    // Entries are at the final stage — a non-configured, non-super user may not post.
    const approveBtns = screen.getAllByRole('button', { name: 'Approve & Post' });
    approveBtns.forEach((b) => expect(b).toBeDisabled());
    expect(screen.queryByRole('button', { name: /✎ Edit/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });
});
