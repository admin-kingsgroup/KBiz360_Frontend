// Voucher Approvals — view-only gating (pins the "disable-with-a-reason, never a live no-op" rule).
//   • A view-only user sees a disabled "👁 View only" indicator in place of the row's write
//     actions (Edit / Check / Verify / Approve / Reject / Delete), and the bulk Approve-all bar
//     is hidden — never a live button that only 403s on the server.
//   • A normal user is unaffected (live actions + bulk Approve-all still render).
// `mockVo` (prefixed `mock` so jest allows it inside the factory) flips isViewOnly per test.
let mockVo = false;
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
  ];
  return ({
    useVoucherApprovals: jest.fn(() => ({ data: { entries, counts: { pending: { n: entries.length, amount: 200 }, approved: { n: 0, amount: 0 }, rejected: { n: 0, amount: 0 }, deleted: { n: 0, amount: 0 } } } })),
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
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve([])), getAuthToken: jest.fn(() => 'open'), isViewOnly: () => mockVo, VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.' }));
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
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VoucherApprovals } from '../approvals';
import { useVoucherApprovals } from '../../core/useAccounting';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};
afterEach(() => jest.clearAllMocks());

describe('Voucher Approvals — view-only gating', () => {
  test('view-only: rows show "View only" and there is no live Reject / bulk Approve-all', () => {
    mockVo = true;
    wrap(<VoucherApprovals branch={'BOM'} currentUser={{ role: 'Director' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entry wise' }));
    // Every actionable row shows the disabled "View only" indicator instead of write buttons…
    expect(screen.getAllByText(/View only/i).length).toBeGreaterThan(0);
    // …and no live write actions are rendered.
    expect(screen.queryByRole('button', { name: /^Reject$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Approve all/ })).toBeNull();
  });

  test('normal user: live row actions + bulk Approve-all still render', () => {
    mockVo = false;
    wrap(<VoucherApprovals branch={'BOM'} currentUser={{ role: 'Director' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entry wise' }));
    expect(screen.queryByText(/👁 View only/)).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Reject$/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Approve all/ })).toBeInTheDocument();
  });
});

describe('Voucher Approvals — Revoke gating on locked (booking-driven) vouchers', () => {
  const leg = (party) => [
    { ledger: party, group: 'Sundry Creditors', subGroup: 'Sundry Creditors', debit: 100, credit: 0 },
    { ledger: 'ICICI Bank', group: 'Bank Accounts', subGroup: 'Bank Accounts', debit: 0, credit: 100 },
  ];
  test('approved tab: an UNLOCKED voucher shows Revoke; a booking-LOCKED one points to its master instead', () => {
    mockVo = false;
    const approved = [
      { id: 'v1', vno: 'PMT/BOM/26/0001', date: '2026-01-01', category: 'payment', type: 'PMT', party: 'Alpha', total: 100, postable: true, errors: [], warnings: [], error: '', locked: false, postings: leg('Alpha') },
      { id: 'v2', vno: 'RF/BOM/26/0021', date: '2026-03-12', category: 'refund', type: 'RF', party: 'NeuIQ', total: 100, postable: true, errors: [], warnings: [], error: '', locked: true, source: 'booking', bookingId: 'RF-BKG/BOM/26/0007', postings: leg('NeuIQ') },
    ];
    useVoucherApprovals.mockReturnValue({ data: { entries: approved, counts: { pending: { n: 0, amount: 0 }, approved: { n: 2, amount: 200 }, rejected: { n: 0, amount: 0 }, deleted: { n: 0, amount: 0 } } } });
    wrap(<VoucherApprovals branch={'BOM'} currentUser={{ role: 'Director' }} />);
    fireEvent.click(screen.getByRole('button', { name: /^Approved/ })); // tab label carries a count suffix
    fireEvent.click(screen.getByRole('button', { name: 'Entry wise' }));
    // Exactly one Revoke button (the unlocked payment); the locked refund shows a pointer instead.
    expect(screen.getAllByRole('button', { name: /^Revoke$/ })).toHaveLength(1);
    expect(screen.getByText(/revoke on .*RF-BKG\/BOM\/26\/0007/i)).toBeInTheDocument();
  });
});
