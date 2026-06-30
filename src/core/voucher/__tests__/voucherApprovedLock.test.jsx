// Approved / posted vouchers are READ-ONLY everywhere they can be opened.
//
// The two approval queues (Voucher Approvals, Booking Approvals) already swap Edit→Revoke
// for approved rows. The gap was the *drill-downs* — Day Book, ledgers, Cash Book, P&L /
// Balance Sheet, registers, GP analytics — which open the SAME editors (VoucherShell for
// registry categories, VoucherEditor for the rest) on ANY voucher, with a live Save that
// re-posts the journal. That let an approved entry be edited outside the workflow.
//
// Both editors now short-circuit to a read-only view for approved/posted vouchers and
// point the user at Revoke. This test renders the registry editor (VoucherShell) to prove
// the gate, and statically guards that the generic editor (VoucherEditor) carries it too.
import fs from 'fs';
import path from 'path';

jest.mock('../../useAccounting', () => ({
  useVoucherPreview: jest.fn(() => ({ data: { postings: [], balanced: true, totalDebit: 0, totalCredit: 0, diff: 0 } })),
  useCreateVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRevokeVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  fetchRevokeCheck: jest.fn(() => Promise.resolve({ blocks: [], warnings: [], journalRows: 2 })),
}));
jest.mock('../../ux/confirm', () => ({ confirmDialog: jest.fn(() => Promise.resolve({ confirmed: false })) }));
const mockIsApprover = jest.fn(() => true);
jest.mock('../../api', () => ({ isViewOnly: () => false, isApprover: () => mockIsApprover() }));
jest.mock('../../PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../../styles', () => ({
  B: {}, bc: () => ({ cur: '₹' }),
  VWrap: ({ children }) => <div>{children}</div>, VHead: () => null,
  FL: ({ children }) => <div>{children}</div>,
  inp: {}, card: {}, btnG: {}, btnGh: {},
}));
jest.mock('../registry', () => ({
  VOUCHER_REGISTRY: {
    payment: {
      label: 'Payment', icon: '₹', type: 'PMT',
      fields: () => <div>FORM FIELDS</div>,
      initial: () => ({}), fromVoucher: () => ({}), toBody: () => ({}),
      validate: () => ({ ok: true, hint: '' }),
    },
  },
}));
jest.mock('../JvBlock', () => ({ JvBlock: () => null }));
jest.mock('../../ux/forms', () => ({ useFormKeys: () => ({ ref: { current: null }, onKeyDown: jest.fn() }) }));
jest.mock('../../ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../ux/widgets.jsx', () => ({ Kbd: () => null }));
jest.mock('../../hooks', () => ({ triggerSaveRefresh: jest.fn() }));
jest.mock('../../useNextNo', () => ({ useVNo: () => 'PMT/BOM/26/0002' }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { VoucherShell } from '../VoucherShell';

const vch = (status) => ({ vno: 'PMT/BOM/26/0001', status, branch: 'BOM', type: 'PMT', category: 'payment' });

describe('VoucherShell (registry edit) — approved vouchers are read-only, not editable', () => {
  beforeEach(() => mockIsApprover.mockReturnValue(true));

  test('an APPROVED voucher shows the read-only notice and no Save button', () => {
    render(<VoucherShell category="payment" mode="edit" voucher={vch('approved')} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/Voucher Approvals/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Voucher/i })).toBeNull();
    expect(screen.queryByText('FORM FIELDS')).toBeNull();
  });

  test('an approver sees a Revoke button beside Print/Close in the read-only view', () => {
    mockIsApprover.mockReturnValue(true);
    render(<VoucherShell category="payment" mode="edit" voucher={vch('approved')} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByRole('button', { name: /Revoke/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
  });

  test('a non-approver gets the read-only view but NO Revoke button', () => {
    mockIsApprover.mockReturnValue(false);
    render(<VoucherShell category="payment" mode="edit" voucher={vch('approved')} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revoke/i })).toBeNull();
  });

  test('a booking-driven (locked) voucher shows no Revoke even for an approver', () => {
    mockIsApprover.mockReturnValue(true);
    render(<VoucherShell category="payment" mode="edit" voucher={{ ...vch('approved'), locked: true, source: 'booking', bookingId: 'SF/BOM/26/0001' }} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByText(/SO \/ PO \/ GP booking/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revoke/i })).toBeNull();
  });

  test('a POSTED voucher is also read-only', () => {
    render(<VoucherShell category="payment" mode="edit" voucher={vch('posted')} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Voucher/i })).toBeNull();
  });

  test('a SAVED voucher is POSTED (real journal) → read-only with Revoke, not editable', () => {
    // The backend writes a journal for BOTH `approved` AND `saved` (a seeded/migrated
    // entry or an approved-booking leg posts immediately as `saved`), and treats `saved`
    // as revocable. So a `saved` voucher is live in the books — editing it directly would
    // re-post outside the approval workflow. It must open read-only, like `approved`.
    render(<VoucherShell category="payment" mode="edit" voucher={vch('saved')} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Voucher/i })).toBeNull();
    expect(screen.queryByText('FORM FIELDS')).toBeNull();
    expect(screen.getByRole('button', { name: /Revoke/i })).toBeInTheDocument();
  });

  test('a PENDING voucher (in the approval queue) is still editable', () => {
    render(<VoucherShell category="payment" mode="edit" voucher={vch('pending')} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByText('FORM FIELDS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Voucher/i })).toBeInTheDocument();
  });
});

describe('guard — the generic VoucherEditor carries the same approved/posted gate', () => {
  test('accountingLive editor blocks editing approved/posted vouchers and offers Revoke', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'modules', 'accountingLive', 'legacy.jsx'), 'utf8');
    // The gate guards every posted status (approved + saved) and offers the shared Revoke.
    expect(src).toMatch(/v\.status === 'approved' \|\| v\.status === 'saved' \|\| v\.status === 'posted'/);
    expect(src).toMatch(/useVoucherRevoke/);
    expect(src).toMatch(/canRevoke && !byBooking && .*doRevoke\(voucherId, dismiss\)/);
  });
});
