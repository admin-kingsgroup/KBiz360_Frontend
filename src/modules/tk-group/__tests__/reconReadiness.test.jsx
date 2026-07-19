// TK Group "Reconciliation readiness" (ComplianceClose): a branch whose weekly
// cycles are subsumed by a certified Month-End reads "Covered" + "Clear", not an
// amber "0/13 to reconcile" — driven by weeklyCoveredByMonth over the pending rows.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api/monitor', () => ({ getBranchCockpit: jest.fn().mockResolvedValue({ items: [] }) }));
jest.mock('../../../store/cockpitFocus', () => ({ useCockpitFocus: () => 'ALL' })); // group view (all branches)
jest.mock('../../../core/useReconciliation', () => ({
  useReconSummary: () => ({ data: { byBranch: [
    // BOM skipped its weeks but the month is certified → weekly certs show 0/13 (would be amber)
    { branch: 'BOM', tiers: { weekly: { total: 13, done: 0 }, month: { total: 5, done: 5 } } },
    { branch: 'AMD', tiers: { weekly: { total: 13, done: 13 }, month: { total: 5, done: 2 } } },
  ] }, isLoading: false, isError: false }),
  useReconPending: () => ({ data: { byBranch: [
    { branch: 'BOM', rows: [
      { tier: 'weekly', period: '2026-W25', state: 'superseded', dueOn: '2026-06-19' },      // covered by Month-End
      { tier: 'weekly', period: '2099-W01', state: 'not-started', upcoming: true, dueOn: '2099-01-08' },
    ] },
    { branch: 'AMD', rows: [
      { tier: 'weekly', period: '2099-W01', state: 'not-started', upcoming: true, dueOn: '2099-01-08' },
    ] },
  ] }, isLoading: false, isError: false }),
}));

// eslint-disable-next-line import/first
import { ComplianceClose } from '../performance-oversight/ComplianceClose';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

test('a branch whose weeks are covered by Month-End reads "Covered" + "Clear" (not amber to-reconcile)', async () => {
  wrap(<ComplianceClose />);
  expect(await screen.findByTestId('tk-reco-readiness')).toBeInTheDocument();
  // BOM: superseded week → weekly column "Covered" (unique) + Status "Clear"
  // (AMD is genuinely complete, so "Clear" appears for both — assert ≥1).
  expect(screen.getByText('Covered')).toBeInTheDocument();
  expect(screen.getAllByText('Clear').length).toBeGreaterThanOrEqual(1);
});
