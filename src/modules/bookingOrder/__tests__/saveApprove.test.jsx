// Regression: the booking entry screens must NOT offer a one-shot "Save & Approve".
// Policy (consistent everywhere): saving a voucher always lands it in PENDING; it is
// approved separately from the Pending queue. So the SO/PO/GP form and the RF/RI
// reversal form expose ONLY a Save button — never a Save & Approve shortcut.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Network / import.meta-bound modules are mocked so the form renders offline.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve([])), apiPost: jest.fn(), apiPut: jest.fn() }));
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
});
