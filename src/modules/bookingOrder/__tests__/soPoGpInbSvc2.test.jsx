// INB Service Charge - 2 for the service-only Insurance module.
//
// Insurance is service-only (no fare columns), so an inter-branch insurance deal used to
// offer ONLY the Service Fee — the SVC2 margin field every other entry mode has was hidden
// (INB posts no SVC2 head). The entry now shows Service Charge - 2 for a service-only
// module in INB mode and, on save, folds its NET amount (gross minus the embedded output
// tax — zero when zero-rated) into the serviceFee sent to the server, which re-levies tax
// ON the SVF: net + tax reproduces the GST-inclusive SVC2 keyed. Other INB modules are
// unchanged (margin = Service Fee alone), and the offline SO/PO/GP grid keeps SVC2 as-is.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve([])), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn() }));
jest.mock('../../../core/useAccounting', () => ({ invalidateBooks: jest.fn(), useVoucherPreview: () => ({ data: {} }) }));
jest.mock('../../../core/useReference', () => ({ useLedgerRegistry: () => ({ data: [] }), useAppConfig: () => ({ data: {} }) }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../../../core/invoiceHtml', () => ({ buildBookingInvoice: jest.fn() }));
jest.mock('../../../core/AuditTrail', () => ({ AuditTrail: () => null }));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../../core/ux/confirm', () => ({ confirmDialog: jest.fn(() => Promise.resolve({ confirmed: true, reason: 'test edit' })) }));

const mockUpdateMutate = jest.fn();
const mockCreateMutate = jest.fn();
jest.mock('../../../core/useInterBranchVoucher', () => ({
  useCreateInb: () => ({ mutate: mockCreateMutate }),
  useUpdateInb: () => ({ mutate: mockUpdateMutate }),
}));

import { SoPoGpVoucherEntry } from '../legacy';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

const SVC2 = /Service Charge - 2/i;

describe('INB voucher — Service Charge - 2 for the service-only Insurance module', () => {
  beforeEach(() => { mockUpdateMutate.mockClear(); mockCreateMutate.mockClear(); });

  test('INB Insurance shows the Service Charge - 2 column', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} initialModule="SI" interBranch />);
    expect(screen.getAllByText(SVC2).length).toBeGreaterThan(0);
  });

  test('INB Flight still hides Service Charge - 2 (margin = Service Fee alone)', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} initialModule="SF" interBranch />);
    // The only mention allowed is the shared legend prose; the SO grid header must not list it.
    expect(screen.queryAllByRole('columnheader', { name: SVC2 }).length).toBe(0);
  });

  test('offline SO/PO/GP Insurance keeps its Service Charge - 2 input (regression)', () => {
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} initialModule="SI" />);
    expect(screen.getAllByRole('columnheader', { name: SVC2 }).length).toBeGreaterThan(0);
  });

  test('saving an INB Insurance deal folds the NET SVC2 into serviceFee (118 gross @18% incl → +100)', async () => {
    // Same-country BOM→AMD deal → billIgst pinned true (taxable): SVC2 118 carries 18
    // embedded GST → net 100 folds into the Service Fee 100 → serviceFee 200. The server
    // re-levies 18% ON the 200 SVF, so the posted gross reproduces what the grid showed.
    wrap(<SoPoGpVoucherEntry branch={{ code: 'BOM' }} setRoute={() => {}} interBranch editBooking={{
      isInterBranch: true, branch: 'BOM', toBranch: 'AMD', module: 'SI', status: 'pending',
      linkNo: 'INB/BOM-AMD/26/0001', date: '2026-06-01', billIgst: true,
      serviceFee: 100, fareLines: [], purchaseHeads: [], passenger: 'SARA KHAN',
    }} />);
    // SO grid inputs (in DOM order): Service Charge - 2, then Service Fee (loaded 100).
    const numInputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(numInputs[0], { target: { value: '118' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes \(Pending\)/i }));
    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
    const body = mockUpdateMutate.mock.calls[0][0];
    expect(body.linkNo).toBe('INB/BOM-AMD/26/0001');
    expect(body.serviceFee).toBe(200);
  });
});
