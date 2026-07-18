// Reconciliation Queue · supersession — a bank ledger whose current week's month is
// certified reads "Covered by Month-End" (not red Overdue) and is NOT counted in the
// ⚠ overdue tile. Hooks are mocked so this is a pure render assertion.
import React from 'react';
import { render, screen } from '@testing-library/react';

// core/styles.jsx → useReference → core/api (import.meta, unparseable by jest); btnGh
// is only a style object here, so stub it.
jest.mock('../../../core/styles', () => ({ btnGh: {} }));
jest.mock('../../../core/useReconciliation', () => ({
  useReconQueue: () => ({ isLoading: false, data: { period: '2026-W33', items: [
    { code: 'B1', name: 'ICICI Bank A/c', group: 'Bank Accounts', status: 'not-started', difference: null, statementImported: false, lastReconciled: null, waitingOn: null, superseded: true, overdue: false },
    { code: 'B2', name: 'HDFC Bank A/c', group: 'Bank Accounts', status: 'open', difference: null, statementImported: true, lastReconciled: null, waitingOn: 'Branch Accountant', superseded: false, overdue: true },
  ] } }),
  useReconSummary: () => ({ data: { tiers: {} } }),
}));
jest.mock('../../../core/useBankReco', () => ({ useBankLedgers: () => ({ data: [] }) }));

import { ReconciliationQueue } from '../statement-matching/reconciliationQueue';

test('Reconciliation Queue: superseded ledger reads "Covered by Month-End"; overdue tile counts only the real overdue', () => {
  render(<ReconciliationQueue branch="BOM" setRoute={() => {}} />);
  // "Covered by Month-End" appears on B1's status badge AND in the legend.
  expect(screen.getAllByText('Covered by Month-End').length).toBeGreaterThanOrEqual(1);
  // Only B2 is overdue → the ⚠ tile counts 1, not 2 (superseded B1 excluded):
  // "overdue this week" present proves ≥1; "⚠ 2" absent proves it isn't counting B1.
  expect(screen.getByText('overdue this week')).toBeInTheDocument();
  expect(screen.queryByText(/⚠\s*2/)).not.toBeInTheDocument();
  // The covered row's action reads "View", not the dead-end "Reconcile".
  expect(screen.getByText('View')).toBeInTheDocument();
});
