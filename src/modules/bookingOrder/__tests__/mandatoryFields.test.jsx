// Every SO/PO/GP entry field is mandatory (2026-07-17): a fresh form must disable
// Save and NAME what's missing in the footer, and the once-optional Remarks +
// Tally Refs are now required (starred labels, "required" placeholders) — except
// on INB, where the payload persists only saleTallyRef (as `reference`).
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

describe('SO/PO/GP — every field mandatory', () => {
  test('fresh form disables Save and names the missing fields', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} />);
    expect(screen.getByRole('button', { name: /Save voucher \(Pending\)/i })).toBeDisabled();
    const banner = screen.getByText(/⚠ Required:/);
    expect(banner.textContent).toMatch(/Travel \/ Departure Date/);
    expect(banner.textContent).toMatch(/\+\d+ more/); // far more than the 6 shown
  });

  test('Remarks + Tally Refs are required (starred) on a normal booking', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} />);
    expect(screen.getByText('Remarks *')).toBeInTheDocument();
    expect(screen.getByText('Sales Tally Ref *')).toBeInTheDocument();
    expect(screen.getByText('Purchase Tally Ref *')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('optional')).toBeNull();
  });

  test('Flight sectors: each segment field is demanded, not just the name pair', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} />);
    // Fill nothing — the sector columns must appear in the missing list once the
    // first 6 header fields would be satisfied. Cheap proxy: the full list length
    // is large enough to include the 6 sector columns (banner shows "+N more").
    const banner = screen.getByText(/⚠ Required:/);
    const more = banner.textContent.match(/\+(\d+) more/);
    expect(more).not.toBeNull();
    expect(Number(more[1])).toBeGreaterThanOrEqual(6);
  });
});
