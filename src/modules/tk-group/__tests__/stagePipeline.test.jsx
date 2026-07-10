import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// The funnel folds THREE pending queues; return a distinct shape per endpoint so the
// test proves each source lands in the pipeline (not just the gated vouchers).
jest.mock('../../../core/api', () => ({
  apiGet: jest.fn((path) => {
    if (path === '/api/vouchers/approvals') return Promise.resolve({ entries: [{ reviewStage: 'approve', total: 5000, date: '2026-07-04' }] }); // → FM
    if (path === '/api/booking-orders') return Promise.resolve([
      { id: 'b1', status: 'pending', reviewStage: 'check', so: { total: 26300 }, date: '2026-07-02' }, // → Branch
      { id: 'b2', status: 'approved', so: { total: 9 }, date: '2026-07-02' },                          // dropped (not pending)
    ]);
    if (path === '/api/vouchers') return Promise.resolve([
      { vno: 'IS/1', category: 'sale', status: 'pending', bookingId: 'INB/A/1', reviewStage: 'verify', total: 50000, date: '2026-07-05' }, // → AE
      { vno: 'IP/1', category: 'purchase', status: 'pending', bookingId: 'INB/A/1', total: 48000, date: '2026-07-05' },                     // same deal
    ]);
    return Promise.resolve(null);
  }),
}));
// One focused branch (INR) so the amount renders and the view is deterministic.
jest.mock('../../../store/cockpitFocus', () => ({ useCockpitFocus: () => 'BOM' }));
jest.mock('../utils/cockpitFocus', () => ({
  focusedBranches: () => [{ code: 'BOM', currency: 'INR' }],
  isFocused: () => true,
}));
jest.mock('../../../core/referenceCache', () => ({ BRANCHES: [{ code: 'BOM', currency: 'INR' }] }));
// eslint-disable-next-line import/first
import { StagePipeline } from '../StagePipeline';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('StagePipeline — funnel folds vouchers + SO/PO/GP + INB', () => {
  test('total counts all three queues (1 voucher + 1 booking + 1 INB deal = 3), not just gated vouchers', async () => {
    renderWith(<StagePipeline />);
    const funnel = await screen.findByTestId('tk-stage-pipeline');
    // Before the fix this read "1 pending" (gated vouchers only). Now all three fold in.
    expect(await screen.findByText(/3 pending/)).toBeInTheDocument();
    // The SO/PO/GP booking (check) sits at Branch, the INB deal (verify) at AE, the
    // gated voucher (approve) at FM — one in each of three distinct stage cards.
    expect(funnel.textContent).toMatch(/Accountants/); // Branch card
    expect(funnel.textContent).toMatch(/Sughra/);      // AE card
    expect(funnel.textContent).toMatch(/Faiz/);        // FM card
  });
});
