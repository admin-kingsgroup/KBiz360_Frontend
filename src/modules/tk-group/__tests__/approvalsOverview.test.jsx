import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Each branch's pending-approvals call returns the same counts here.
jest.mock('../../../core/api', () => ({
  apiGet: jest.fn().mockResolvedValue({
    counts: { pending: { n: 4, amount: 100000 }, approved: { n: 10, amount: 0 } },
    entries: [{ reviewStage: 'check' }, { reviewStage: 'verify' }, { reviewStage: 'approve' }, { reviewStage: '' }],
  }),
}));
// Keep the branch set deterministic for the assertion.
jest.mock('../../../core/referenceCache', () => ({
  BRANCHES: [
    { code: 'BOM', flag: '🇮🇳', currency: 'INR' },
    { code: 'NBO', flag: '🇰🇪', currency: 'USD' },
  ],
}));
// eslint-disable-next-line import/first
import { ApprovalsOverview } from '../ApprovalsOverview';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ApprovalsOverview', () => {
  test('shows the branchwise pending backlog and a currency-split total (never blended)', async () => {
    renderWith(<ApprovalsOverview />);
    await screen.findByTestId('tk-approvals-overview');
    // both branches render (awaited — the table shows a loading state until the
    // per-branch queries resolve, so a real outage no longer reads as "0 pending")
    expect(await screen.findByText(/BOM/)).toBeInTheDocument();
    expect(await screen.findByText(/NBO/)).toBeInTheDocument();
    // total pending = 4 + 4 across the two branches
    expect(await screen.findByText(/8/)).toBeInTheDocument();
    // states the branchwise / no-blend rule
    expect(screen.getByText(/never summed across currencies/i)).toBeInTheDocument();
  });

  test('shows the pipeline funnel with the real Check → Verify (Sughra) → Approve (Faiz) stages', async () => {
    renderWith(<ApprovalsOverview />);
    const funnel = await screen.findByTestId('tk-approvals-funnel');
    expect(funnel.textContent).toMatch(/Awaiting Verify/);
    expect(funnel.textContent).toMatch(/Sughra/);
    expect(funnel.textContent).toMatch(/Faiz/);
  });
});
