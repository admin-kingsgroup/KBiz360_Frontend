// INB SPG Approvals tab — the two INB legs (sale + airline purchase) group into ONE
// deal by INB Link No (sourceRef); Pending deals can be approved (posts BOTH legs via
// approve-many) or rejected; an already-posted ('saved') deal shows under Approved.
// (jest.mock factories may only reference vars prefixed `mock`.)
const mockApiGet = jest.fn();
const mockApproveMany = jest.fn();
const mockRejectAsync = jest.fn(() => Promise.resolve());
const mockConfirm = jest.fn(() => Promise.resolve({ confirmed: true, reason: 'x' }));

jest.mock('../../core/api', () => ({ apiGet: (...a) => mockApiGet(...a), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../../core/useAccounting', () => ({
  useVoucherApprovals: jest.fn(() => ({ data: {} })),
  useApproveVoucher: jest.fn(() => ({ mutate: jest.fn() })),
  useRejectVoucher: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: (...a) => mockRejectAsync(...a) })),
  useDeleteVoucher: jest.fn(() => ({ mutate: jest.fn() })),
  useRevokeVoucher: jest.fn(() => ({ mutate: jest.fn() })),
  fetchRevokeCheck: jest.fn(),
  useApproveMany: jest.fn(() => ({ mutate: (...a) => mockApproveMany(...a) })),
  useApproveAll: jest.fn(() => ({ mutate: jest.fn() })),
  branchCode: jest.fn(() => 'BOM'),
}));
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../../core/data', () => ({ CONSOLIDATED_LABEL: 'TK Head Office Group' }));
jest.mock('../../core/AuditTrail', () => ({ AuditTrail: () => null }));
jest.mock('../../core/voucher/JvBlock', () => ({ JvBlock: () => null }));
jest.mock('../pnlTally', () => ({ VoucherView: () => null }));
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
import { InbApprovals } from '../voucherApprovals';

// One INB deal = a SALE leg + a PURCHASE leg sharing the same sourceRef (INB Link No).
const LINK = 'INB/BOM-AMD/26/0001';
const mkLegs = (status) => [
  { id: 'sale1', vno: 'INB/BOM/26/0003', category: 'sale', type: 'INB', branch: 'BOM', party: 'Travkings Tours and Travels AMD',
    date: '2026-06-23', sourceRef: LINK, status, total: 30551, taxAmt: 21.81, costCenter: 'BOM-INB-FLT-INT',
    lines: [{ ledger: 'IT-Base Fare [IB]', amt: 25845 }, { ledger: 'IT-SVF [IB]', amt: 121.19 }] },
  { id: 'pur1', vno: 'INB/BOM/26/0004', category: 'purchase', type: 'INB', branch: 'BOM', party: 'TRIP JACK',
    date: '2026-06-23', sourceRef: LINK, status, total: 29113, taxAmt: 0, costCenter: 'BOM-INB-FLT-INT',
    lines: [{ ledger: 'IT-Base Fare [Pur]', amt: 25845 }] },
];

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};
afterEach(() => jest.clearAllMocks());

describe('INB SPG Approvals', () => {
  test('groups the two legs into ONE pending deal row under the INB Link No', async () => {
    mockApiGet.mockResolvedValue(mkLegs('pending'));
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText(LINK)).toBeInTheDocument();
    expect(mockApiGet).toHaveBeenCalledWith('/api/vouchers', { type: 'INB', branch: 'BOM' });
    expect(screen.getByText('BOM → AMD')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1);
  });

  test('Approve posts BOTH legs via approve-many (sale + purchase ids)', async () => {
    mockApiGet.mockResolvedValue(mkLegs('pending'));
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(mockApproveMany).toHaveBeenCalled());
    const arg = mockApproveMany.mock.calls[0][0];
    expect(arg.ids.sort()).toEqual(['pur1', 'sale1']);
  });

  test('historical folded legs pair via againstPurchase even when sourceRef differs', async () => {
    // Real post-migration shape: legs keep their ORIGINAL Tally sourceRefs (DS/01 vs
    // DP/01) — only the sale's againstPurchase links them. Must still be ONE deal.
    const legs = mkLegs('saved').map((l) => ({ ...l, sourceRef: l.category === 'sale' ? 'DS/01' : 'DP/01' }));
    legs.find((l) => l.category === 'sale').againstPurchase = 'INB/BOM/26/0004';
    mockApiGet.mockResolvedValue(legs);
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Approved/ }));
    // one deal row → identified by the sale vno (no INB-link sourceRef present)
    expect(screen.getByText('INB/BOM/26/0003')).toBeInTheDocument();
    expect(screen.getByText('BOM → AMD')).toBeInTheDocument();
    // both legs present (Sale + Pur), not two separate rows
    expect(screen.getByText('Sale + Pur')).toBeInTheDocument();
  });

  test('a posted (saved) deal shows under Approved, not Pending', async () => {
    mockApiGet.mockResolvedValue(mkLegs('saved'));
    wrap(<InbApprovals branch={'BOM'} currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText('No pending INB deals.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Approved/ }));
    expect(screen.getByText(LINK)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
  });
});
