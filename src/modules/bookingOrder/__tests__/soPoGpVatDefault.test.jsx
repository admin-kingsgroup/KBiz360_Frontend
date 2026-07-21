// A NEW SO/PO/GP voucher on an Africa/VAT branch (NBO/DAR/FBM) must open WITHOUT VAT — VAT is
// billed only if the operator consciously ticks "With VAT". India branches are untouched (they
// have no toggle at all and always follow the per-module GST rule). The screen's own helper
// caption is the tell: "No VAT calculated …" ⇒ noVat=true (Without VAT active); "VAT charged …"
// ⇒ noVat=false (With VAT active). Asserting on the caption is exactly what the operator reads.
//
// Guards three things that could regress the default:
//   1. the useState initialiser (branch present at mount),
//   2. the brCode-sync effect (a later top-bar branch switch — incl. the ALL → specific path,
//      the usual way a voucher is begun, since a voucher can't be raised under ALL),
//   3. that an EDIT is never stomped — a saved With-VAT voucher must still open With VAT.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

const ZERO_RATED = /No VAT calculated on this booking \(zero-rated\)\./i;
const VAT_CHARGED = /VAT charged at the branch rate on the Service Fee/i;

describe('SO/PO/GP — a new Africa voucher opens WITHOUT VAT by default', () => {
  test.each(['FBM', 'NBO', 'DAR'])('%s: fresh voucher shows the zero-rated (Without VAT) caption, not "VAT charged"', (br) => {
    wrap(<SoPoGpVoucherEntry branch={{ code: br }} setRoute={() => {}} />);
    expect(screen.getByText(ZERO_RATED)).toBeInTheDocument();
    expect(screen.queryByText(VAT_CHARGED)).toBeNull();
  });

  test('BOM (India): no VAT toggle at all — the change is Africa-scoped, India unaffected', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} />);
    expect(screen.queryByText(ZERO_RATED)).toBeNull();
    expect(screen.queryByText(VAT_CHARGED)).toBeNull();
  });

  test('switching the top-bar branch India → NBO re-derives the default to Without VAT (no remount)', () => {
    // The form is not remounted on a branch switch, so only the effect can carry the default across.
    const { rerender } = wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} />);
    expect(screen.queryByText(ZERO_RATED)).toBeNull();               // India: no toggle
    rerender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SoPoGpVoucherEntry branch={{ code: 'NBO' }} setRoute={() => {}} />
    </QueryClientProvider>);
    expect(screen.getByText(ZERO_RATED)).toBeInTheDocument();        // NBO: opens Without VAT
    expect(screen.queryByText(VAT_CHARGED)).toBeNull();
  });

  test('EDIT of a saved With-VAT FBM voucher is NOT stomped — it re-opens With VAT', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'FBM' }} setRoute={() => {}} editBooking={{
      id: 'f2', branch: 'FBM', date: '2026-06-01', module: 'SF', noVat: false,
      customer: { name: 'ACME', ledgerName: 'ACME' }, supplier: { name: 'Kenya Air', ledgerName: 'Kenya Air' },
      so: { total: 1000 }, po: { total: 800 }, gp: { total: 200, pct: 20 }, rows: [], status: 'pending',
    }} />);
    expect(screen.getByText(VAT_CHARGED)).toBeInTheDocument();
    expect(screen.queryByText(ZERO_RATED)).toBeNull();
  });
});
