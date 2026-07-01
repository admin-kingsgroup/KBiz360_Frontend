// Pending tab must show EVERY pending voucher with no date filter — so the period
// bar (All/Today/Week/MTD/QTD/LFY/CFY + the date-range inputs) is hidden on Pending
// and only appears on the settled tabs (Approved/Rejected/Deleted/Edited). Uses the
// REAL period module so the assertion proves the bar is actually absent/present.
jest.mock('../../core/useAccounting', () => ({
  useVoucherApprovals: jest.fn(() => ({ data: { entries: [] } })),
  useApproveVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRejectVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRevokeVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  fetchRevokeCheck: jest.fn(() => Promise.resolve({ revocable: true, journalRows: 2, blocks: [], warnings: [] })),
  useApproveMany: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useApproveAll: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  branchCode: jest.fn(() => 'BOM'),
}));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../../core/data', () => ({ CONSOLIDATED_LABEL: 'TK Head Office Group' }));
// Heavy / irrelevant children → inert.
jest.mock('../../core/AuditTrail', () => ({ AuditTrail: () => null }));
jest.mock('../../core/voucher/JvBlock', () => ({ JvBlock: () => null }));
jest.mock('../pnlTally', () => ({ VoucherView: () => null }));
jest.mock('../accountingLive', () => ({ VoucherEditor: () => null }));
jest.mock('../bookingOrder', () => ({ BookingApprovals: () => null }));
jest.mock('../../core/voucher-print', () => ({ openPrintWindow: jest.fn() }));
jest.mock('../../core/ux/useModalEsc', () => ({ useModalEsc: jest.fn() }));
jest.mock('../../core/ux/confirm', () => ({ confirmDialog: jest.fn() }));
jest.mock('../../core/ux/clickable', () => ({ clickable: () => ({}) }));
jest.mock('../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../core/ux/FocusBanner', () => ({ FocusBanner: () => null }));
jest.mock('../../core/ux/navFocus', () => ({ useNavFocusStore: jest.fn(() => null) }));
jest.mock('../../shell/primitives', () => ({ SkeletonTable: () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VoucherApprovals } from '../voucherApprovals';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

afterEach(() => jest.clearAllMocks());

describe('Voucher Approvals — period bar visibility', () => {
  test('Pending tab (default) hides the period bar and date-range inputs', () => {
    wrap(<VoucherApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    // The Pending tab itself is present…
    expect(screen.getByRole('button', { name: /^Pending/ })).toBeInTheDocument();
    // …but none of the period presets nor the date inputs are rendered.
    ['Today', 'Week', 'MTD', 'QTD', 'LFY', 'CFY'].forEach((p) =>
      expect(screen.queryByRole('button', { name: p })).toBeNull());
    expect(document.querySelectorAll('input[type="date"]').length).toBe(0);
  });

  test('Switching to Approved reveals the period bar again', () => {
    wrap(<VoucherApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(screen.getByRole('button', { name: /^Approved/ }));
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'MTD' })).toBeInTheDocument();
    expect(document.querySelectorAll('input[type="date"]').length).toBeGreaterThan(0);
  });
});
