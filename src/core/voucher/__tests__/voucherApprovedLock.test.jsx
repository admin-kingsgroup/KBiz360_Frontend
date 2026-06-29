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
}));
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
jest.mock('../../api', () => ({ isViewOnly: () => false }));
jest.mock('../../hooks', () => ({ triggerSaveRefresh: jest.fn() }));
jest.mock('../../useNextNo', () => ({ useVNo: () => 'PMT/BOM/26/0002' }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { VoucherShell } from '../VoucherShell';

const vch = (status) => ({ vno: 'PMT/BOM/26/0001', status, branch: 'BOM', type: 'PMT', category: 'payment' });

describe('VoucherShell (registry edit) — approved vouchers are read-only, not editable', () => {
  test('an APPROVED voucher shows the Revoke notice and no Save button', () => {
    render(<VoucherShell category="payment" mode="edit" voucher={vch('approved')} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/Revoke/)).toBeInTheDocument();
    expect(screen.getByText(/Voucher Approvals/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Voucher/i })).toBeNull();
    expect(screen.queryByText('FORM FIELDS')).toBeNull();
  });

  test('a POSTED voucher is also read-only', () => {
    render(<VoucherShell category="payment" mode="edit" voucher={vch('posted')} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Voucher/i })).toBeNull();
  });

  test('a SAVED (draft) voucher still opens the editable form with Save', () => {
    render(<VoucherShell category="payment" mode="edit" voucher={vch('saved')} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByText('FORM FIELDS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Voucher/i })).toBeInTheDocument();
    expect(screen.queryByText(/read-only/i)).toBeNull();
  });

  test('a PENDING voucher (in the approval queue) is still editable', () => {
    render(<VoucherShell category="payment" mode="edit" voucher={vch('pending')} cur="₹" onBack={jest.fn()} />);
    expect(screen.getByText('FORM FIELDS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Voucher/i })).toBeInTheDocument();
  });
});

describe('guard — the generic VoucherEditor carries the same approved/posted gate', () => {
  test('accountingLive editor blocks editing approved/posted vouchers', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'modules', 'accountingLive', 'legacy.jsx'), 'utf8');
    // The gate guards both statuses and routes the user to Revoke.
    expect(src).toMatch(/v\.status === 'approved' \|\| v\.status === 'posted'/);
    expect(src).toMatch(/Revoke/);
  });
});
