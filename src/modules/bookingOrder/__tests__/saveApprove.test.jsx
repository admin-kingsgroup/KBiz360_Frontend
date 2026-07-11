// Regression: the booking entry screens must NOT offer a one-shot "Save & Approve".
// Policy (consistent everywhere): saving a voucher always lands it in PENDING; it is
// approved separately from the Pending queue. So the SO/PO/GP form and the RF/RI
// reversal form expose ONLY a Save button — never a Save & Approve shortcut.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Network / import.meta-bound modules are mocked so the form renders offline.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve([])), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn() }));
jest.mock('../../../core/useAccounting', () => ({ invalidateBooks: jest.fn(), useVoucherPreview: () => ({ data: {} }) }));
jest.mock('../../../core/useReference', () => ({ useLedgerRegistry: () => ({ data: [] }), useAppConfig: () => ({ data: {} }) }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../../../core/invoiceHtml', () => ({ buildBookingInvoice: jest.fn() }));
jest.mock('../../../core/AuditTrail', () => ({ AuditTrail: () => null }));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../../core/ux/confirm', () => ({ confirmDialog: jest.fn(() => Promise.resolve({ confirmed: false })) }));

import { SoPoGpVoucherEntry } from '../legacy';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

const baseBooking = {
  id: 'b1', branch: 'BOM', date: '2026-06-01',
  customer: { name: 'ACME', ledgerName: 'ACME' }, supplier: { name: 'TBO', ledgerName: 'TBO' },
  so: { total: 1000 }, po: { total: 800 }, gp: { total: 200, pct: 20 }, rows: [], status: 'pending',
};

describe('booking entry — no one-shot Save & Approve', () => {
  test('SO/PO/GP edit form shows Save (Pending) and NO Save & Approve', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} editBooking={{ ...baseBooking, module: 'SF' }} />);
    expect(screen.queryByText(/Save\s*&\s*Approve/i)).toBeNull();
    expect(screen.getByText(/Save changes \(Pending\)/i)).toBeInTheDocument();
  });

  test('RF/RI reversal edit form shows Save (Pending) and NO Save & Approve', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} editBooking={{ ...baseBooking, module: 'RF', reversal: { supplierAmt: 500 }, againstInvoice: 'SF/BOM/26/0001' }} />);
    expect(screen.queryByText(/Save\s*&\s*Approve/i)).toBeNull();
    expect(screen.getByText(/Save \(Pending\)/i)).toBeInTheDocument();
  });

  // The RF/RI reversal EDIT form must match the main SO/PO/GP edit form: an "EDIT — <no>"
  // header for context and a Cancel button so the user can back out without saving (the
  // create form has neither — they are edit-only).
  test('RF/RI reversal edit form shows the EDIT header and a Cancel escape hatch', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} editBooking={{ ...baseBooking, bookingNo: 'RF/BOM/26/0007', module: 'RF', reversal: { supplierAmt: 500 }, againstInvoice: 'SF/BOM/26/0001' }} />);
    expect(screen.getByText(/EDIT — RF\/BOM\/26\/0007/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('RF/RI reversal CREATE form has no Cancel button (create-only)', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} initialModule="RF" />);
    expect(screen.queryByRole('button', { name: /Cancel/i })).toBeNull();
  });

  // Go-forward guard is DIRECTION-specific. An inter-branch CUSTOMER (selling to another
  // branch) must use the INB Voucher → blocked. An inter-branch SUPPLIER (buying from
  // another branch — the buyer-side of a pushed INB deal) is a normal purchase → allowed.
  test('SO/PO/GP form BLOCKS an inter-branch CUSTOMER (seller direction) — warns and disables Save', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} editBooking={{ ...baseBooking, module: 'SF', customer: { name: 'Travkings Tours and Travels AMD', ledgerName: 'Travkings Tours and Travels AMD' } }} />);
    expect(screen.getByText(/Inter-branch customer detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to INB Voucher/i)).toBeInTheDocument();
    expect(screen.getByText(/Save changes \(Pending\)/i).closest('button')).toBeDisabled();
  });

  test('SO/PO/GP form ALLOWS an inter-branch SUPPLIER (buyer direction) — no block', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} editBooking={{ ...baseBooking, module: 'SF', supplier: { name: 'Travkings Tours and Travels AMD', ledgerName: 'Travkings Tours and Travels AMD' } }} />);
    expect(screen.queryByText(/Inter-branch customer detected/i)).toBeNull();
  });

  test('a normal (non inter-branch) SO/PO/GP booking shows NO inter-branch warning', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} editBooking={{ ...baseBooking, module: 'SF' }} />);
    expect(screen.queryByText(/Inter-branch customer detected/i)).toBeNull();
  });

  // Regression: revoke re-opened the refund BLANK because the editor never hydrated the
  // airline cancellation + commission clawback back from editBooking.reversal. On edit
  // those values MUST re-show (else re-approving silently drops them → the client amount
  // changes). Uses distinct values so getByDisplayValue is unambiguous.
  test('RF reversal edit re-hydrates the cancellation + commission fields', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} editBooking={{
      ...baseBooking, bookingNo: 'RF/BOM/26/0874', module: 'RF', againstInvoice: 'SF/BOM/26/0001',
      reversal: { supplierAmt: 12345, supplierCancel: 3610, incentiveAmt: 1760, incentiveTds: 35, cancelRecover: true },
    }} />);
    expect(screen.getByDisplayValue('12345')).toBeInTheDocument(); // supplier refund
    expect(screen.getByDisplayValue('3610')).toBeInTheDocument();  // airline cancellation fee
    expect(screen.getByDisplayValue('1760')).toBeInTheDocument();  // commission clawback
    expect(screen.getByDisplayValue('35')).toBeInTheDocument();    // TDS reversed
  });
});
