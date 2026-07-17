// The INB voucher's tax tick must state the tax the SERVER will actually post, and Client Type
// must not sit on the screen as a live no-op.
//
// Two regressions, both seen on FBM (Lubumbashi — a VAT branch, 16%):
//   1. The tick read "IGST on Service Fee" / "Bill IGST 18% even cross-border" on EVERY branch,
//      because both the name and the rate were hardcoded. The backend has always rated the fee off
//      the SELLER's regime (inb.service.inbTaxTreatment: `isVat ? vatRateOf(fromBranch) : 18`), so
//      an FBM seller was told "IGST 18%" for a posting that lands as VAT 16%. The math was right;
//      only the label lied — the dangerous direction, since the operator ticks a box trusting a
//      rate that never lands.
//   2. Client Type offered "All Client Types" on an INB deal, where it has no filter target (the
//      customer picker it narrows is replaced by the To Branch dropdown) and no payload
//      destination (inbBody sends no clientType) — a control that looked live and did nothing.
//
// inbTaxLabel.test.js pins the pure rule; this pins that the SCREEN actually renders it.
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

// An INB deal in EDIT mode is the only way to preload a counterparty without driving the dropdown
// (toBranch hydrates from editBooking.toBranch when isInterBranch).
const inbDeal = (over = {}) => ({
  id: 'b1', date: '2026-06-01', module: 'SF', isInterBranch: true,
  customer: { name: 'Travkings Tours and Travels BOM', ledgerName: 'Travkings Tours and Travels BOM' },
  supplier: { name: 'IATA-BSP', ledgerName: 'IATA-BSP' },
  so: { total: 1000 }, po: { total: 800 }, gp: { total: 200, pct: 20 }, rows: [], status: 'pending',
  ...over,
});

const renderInb = (branchCode, deal) => wrap(
  <SoPoGpVoucherEntry branch={{ code: branchCode }} setRoute={() => {}} interBranch editBooking={deal} />,
);

describe('INB tax tick — the label states the SELLER regime, not a hardcoded IGST 18%', () => {
  test('FBM seller (VAT 16) → the tick reads VAT 16%, never IGST 18%', () => {
    renderInb('FBM', inbDeal({ branch: 'FBM', toBranch: 'BOM' }));   // CD→IN, cross-border
    expect(screen.getByText(/Bill VAT 16% even cross-border/i)).toBeInTheDocument();
    expect(screen.getByText(/^VAT on Service Fee$/i)).toBeInTheDocument();
    // The exact regression — neither the wrong name nor the wrong rate may survive anywhere.
    expect(screen.queryByText(/Bill IGST 18% even cross-border/i)).toBeNull();
    expect(screen.queryByText(/IGST on Service Fee/i)).toBeNull();
  });

  test('FBM seller, tick OFF → the zero-rated hint says VAT, not IGST', () => {
    renderInb('FBM', inbDeal({ branch: 'FBM', toBranch: 'BOM', billIgst: false }));
    expect(screen.getByText(/Zero-rated export — no VAT on the Service Fee/i)).toBeInTheDocument();
    expect(screen.queryByText(/no IGST on the Service Fee/i)).toBeNull();
  });

  test('FBM seller, tick ON → the banner quotes VAT at 16%, matching what the server posts', () => {
    renderInb('FBM', inbDeal({ branch: 'FBM', toBranch: 'BOM', billIgst: true }));
    expect(screen.getByText(/VAT.*inter-branch.*16% on Service Fee/i)).toBeInTheDocument();
    expect(screen.queryByText(/IGST.*18% on Service Fee/i)).toBeNull();
  });

  test('DAR seller (VAT 18) → VAT-named even though the rate matches IGST', () => {
    // The rate alone can't distinguish DAR here — a revert of the NAME only would slip past a
    // rate assertion, so this branch is the one that proves the name is really derived.
    renderInb('DAR', inbDeal({ branch: 'DAR', toBranch: 'BOM' }));   // TZ→IN
    expect(screen.getByText(/Bill VAT 18% even cross-border/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bill IGST/i)).toBeNull();
  });

  test('India seller → still IGST 18% (the fix must not flip India to VAT)', () => {
    renderInb('BOM', inbDeal({ branch: 'BOM', toBranch: 'FBM' }));   // IN→CD
    expect(screen.getByText(/Bill IGST 18% even cross-border/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bill VAT/i)).toBeNull();
  });

  test('a same-country INB deal shows no tick at all (always taxable, nothing to choose)', () => {
    renderInb('BOM', inbDeal({ branch: 'BOM', toBranch: 'AMD' }));   // IN→IN
    expect(screen.queryByText(/even cross-border/i)).toBeNull();
    expect(screen.getByText(/IGST.*inter-state.*18% on Service Fee/i)).toBeInTheDocument();
  });
});

describe('Client Type on an INB voucher — stated and locked, not a live no-op', () => {
  test('reads "Inter Branch", is disabled, and says why', () => {
    renderInb('FBM', inbDeal({ branch: 'FBM', toBranch: 'BOM' }));
    const field = screen.getByDisplayValue('Inter Branch');
    expect(field).toBeInTheDocument();
    expect(field).toBeDisabled();
    // Never leave a disabled control unexplained.
    expect(screen.getByText(/the counterparty is the To Branch/i)).toBeInTheDocument();
    // The old live-but-inert dropdown must be gone.
    expect(screen.queryByText(/All Client Types/i)).toBeNull();
  });

  test('a NORMAL (non-INB) voucher keeps the real Client Type dropdown', () => {
    // The lock is INB-only — the regular SO/PO/GP screen still needs the filter.
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} editBooking={{
      id: 'b2', branch: 'BOM', date: '2026-06-01', module: 'SF',
      customer: { name: 'ACME', ledgerName: 'ACME' }, supplier: { name: 'TBO', ledgerName: 'TBO' },
      so: { total: 1000 }, po: { total: 800 }, gp: { total: 200, pct: 20 }, rows: [], status: 'pending',
    }} />);
    expect(screen.getByText(/All Client Types/i)).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Inter Branch')).toBeNull();
  });
});
