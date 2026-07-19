// ReconciliationHub · group-mode branch-wise readiness matrix — the "covered"
// weekly cell (a branch whose weeks are subsumed by a certified Month-End close)
// only renders in group mode, so it needs its own test.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api', () => ({
  getScopeTree: jest.fn(() => Promise.resolve({ groups: [], counts: { total: 0 } })),
  getSummary: jest.fn(() => Promise.resolve({
    periods: { weekly: '2026-W29', month: '2026-07' }, tiers: {},
    byBranch: [
      { branch: 'BOM', tiers: { weekly: { total: 13, done: 0 }, month: { total: 5, done: 5 } } }, // weeks skipped, month certified
      { branch: 'AMD', tiers: { weekly: { total: 13, done: 13 }, month: { total: 5, done: 2 } } },
    ],
  })),
  getPending: jest.fn(() => Promise.resolve({
    rows: [],
    byBranch: [
      { branch: 'BOM', rows: [{ tier: 'weekly', period: '2026-W25', state: 'superseded', dueOn: '2026-06-19' }] },
      { branch: 'AMD', rows: [{ tier: 'weekly', period: '2026-W29', state: 'not-started', upcoming: true, dueOn: '2026-07-17' }] },
    ],
  })),
}));
jest.mock('../../../store/cockpitFocus', () => ({ useCockpitFocus: () => 'ALL' })); // group view

import { ReconciliationHub } from '../hub/ReconciliationHub';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

test('group-mode readiness matrix: a branch whose weeks are covered by Month-End reads "Covered"', async () => {
  wrap(<ReconciliationHub branch="ALL" tier="weekly" setRoute={() => {}} currentUser={{ role: 'Super Admin' }} />);
  expect(await screen.findByText('Branch-wise readiness')).toBeInTheDocument(); // the matrix section
  // BOM skipped its weeks but certified the month → its weekly cell reads "Covered",
  // not an amber "0/13" (AMD, genuinely complete, shows 13/13 not "Covered").
  expect(await screen.findByText('Covered')).toBeInTheDocument();
});
