// Voucher Approvals — search box + latest-first ordering.
//   • The list orders newest date first across views.
//   • Typing in the search box filters by Vch No / party / ledger / amount and
//     shows a live match count.
jest.mock('../../core/useAccounting', () => {
  const mkEntry = (vno, date, party) => ({
    id: vno, vno, date, category: 'payment', type: 'PMT', party, total: 100,
    postable: true, errors: [], warnings: [], error: '',
    postings: [
      { ledger: party, group: 'Sundry Creditors', subGroup: 'Sundry Creditors', debit: 100, credit: 0 },
      { ledger: 'ICICI Bank', group: 'Bank Accounts', subGroup: 'Bank Accounts', debit: 0, credit: 100 },
    ],
  });
  const entries = [
    mkEntry('PMT/BOM/26/0001', '2026-01-01', 'Alpha Travels'),
    mkEntry('PMT/BOM/26/0009', '2026-03-09', 'Beta Holidays'),
    mkEntry('PMT/BOM/26/0005', '2026-02-05', 'Gamma Tours'),
  ];
  return ({
  useVoucherApprovals: jest.fn(() => ({ data: { entries } })),
  useApproveVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRejectVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRevokeVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  fetchRevokeCheck: jest.fn(() => Promise.resolve({ revocable: true, journalRows: 2, blocks: [], warnings: [] })),
  useApproveMany: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useApproveAll: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  branchCode: jest.fn(() => 'BOM'),
  });
});
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve([])), getAuthToken: jest.fn(() => 'open'), isViewOnly: () => false }));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../../core/data', () => ({ CONSOLIDATED_LABEL: 'TK Head Office Group' }));
jest.mock('../../core/AuditTrail', () => ({ AuditTrail: () => null }));
jest.mock('../../core/voucher/JvBlock', () => ({ JvBlock: () => null }));
jest.mock('../reportsFinancial/pnlTally', () => ({ VoucherView: () => null }));
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
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VoucherApprovals } from '../approvals';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};
afterEach(() => jest.clearAllMocks());

// Read the Vch No column of the Entry-wise table in DOM order.
const vnoOrder = () => screen.getAllByText(/PMT\/BOM\/26\/\d+/).map((n) => n.textContent);

describe('Voucher Approvals — search + latest-first', () => {
  test('orders newest date first (Entry wise view)', () => {
    wrap(<VoucherApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entry wise' }));
    expect(vnoOrder()).toEqual(['PMT/BOM/26/0009', 'PMT/BOM/26/0005', 'PMT/BOM/26/0001']);
  });

  test('search box filters by party and reports the match count', () => {
    wrap(<VoucherApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entry wise' }));
    fireEvent.change(screen.getByLabelText('Search vouchers'), { target: { value: 'beta' } });
    expect(screen.getByText('PMT/BOM/26/0009')).toBeInTheDocument();
    expect(screen.queryByText('PMT/BOM/26/0001')).toBeNull();
    expect(screen.queryByText('PMT/BOM/26/0005')).toBeNull();
    expect(screen.getByText('1 match')).toBeInTheDocument();
  });

  test('search box filters by Vch No', () => {
    wrap(<VoucherApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entry wise' }));
    fireEvent.change(screen.getByLabelText('Search vouchers'), { target: { value: '0005' } });
    expect(vnoOrder()).toEqual(['PMT/BOM/26/0005']);
  });
});
