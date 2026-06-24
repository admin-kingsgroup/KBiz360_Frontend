// Alerts Dashboard: severity KPI strip + domain-grouped Open list, a Fixed tab
// with the auto-resolution audit trail, and the branch-specific (no group) rule.
// Alerts auto-resolve — there is no manual Finish. useAccounting/toast/navFocus mocked.

jest.mock('../../../core/api', () => ({ apiGet: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../../../core/ux/navFocus', () => ({ setNavFocus: jest.fn() }));
jest.mock('../../../core/ux/toast', () => ({ toastInfo: jest.fn() }));

const mockBRANCH = {
  generatedAt: new Date().toISOString(),
  branchRequired: false,
  counts: { error: 1, warn: 1, info: 1 },
  statusCounts: { open: 3, fixed: 1 },
  domains: [{ key: 'acct', label: 'Accounting', pending: 1 }, { key: 'recon', label: 'Reconciliation', pending: 1 }, { key: 'tax', label: 'Tax', pending: 1 }],
  alerts: [
    { key: 'tb:BOM', type: 'tb-unbalanced', domain: 'acct', severity: 'error', title: 'Trial Balance not balanced', detail: 'out by 500', link: '/trial-balance' },
    { key: 'rb:BOM', type: 'recon-bank', domain: 'recon', severity: 'warn', title: 'Bank statement reconciliation pending', detail: '12 open', link: '/bank-reco' },
    { key: 'gst:BOM', type: 'gst-payable', domain: 'tax', severity: 'info', title: 'GST payable outstanding', detail: 'deposit & file', link: '/tax/gstr3b' },
  ],
  resolved: [
    { alertKey: 'sus:BOM', type: 'suspense', severity: 'error', title: 'Suspense balance', detail: 'was 12,000', firstSeenAt: '2026-06-22T00:00:00Z', resolvedAt: '2026-06-23T10:00:00Z', openMs: 34 * 3600000, resolvedBy: 'ravi@kbiz', resolvedHow: 'edit voucher V42', link: '/trial-balance' },
  ],
};
const mockGROUP = { branchRequired: true, counts: { error: 0, warn: 0, info: 0 }, statusCounts: { open: 0, fixed: 0 }, domains: [], alerts: [], resolved: [] };
jest.mock('../../../core/useAccounting', () => ({
  useAlerts: (b) => ({ data: (b && b.code === 'ALL') ? mockGROUP : mockBRANCH, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertsDashboard } from '../pages/alerts-dashboard';

const renderIt = (branch = { code: 'BOM' }) => render(<AlertsDashboard branch={branch} setRoute={jest.fn()} />);

describe('Alerts Dashboard — Open / Fixed model', () => {
  test('Open tab groups alerts into domain sections; no Finish action', () => {
    renderIt();
    expect(screen.getAllByText('Accounting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reconciliation').length).toBeGreaterThan(0);
    expect(screen.getByText('Trial Balance not balanced')).toBeInTheDocument();
    expect(screen.queryByText('Finish')).not.toBeInTheDocument();
    expect(screen.queryByText('Remind')).not.toBeInTheDocument();
  });

  test('severity KPI strip filters the Open list', () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: /Critical/ }));
    expect(screen.getByText('Trial Balance not balanced')).toBeInTheDocument();
    expect(screen.queryByText('GST payable outstanding')).not.toBeInTheDocument();
  });

  test('Fixed tab shows the audit trail (what / how long / by whom)', () => {
    renderIt();
    fireEvent.click(screen.getByText(/Fixed/));
    expect(screen.getByText('Suspense balance')).toBeInTheDocument();
    expect(screen.getByText(/open for/)).toBeInTheDocument();      // duration
    expect(screen.getByText('ravi@kbiz')).toBeInTheDocument();     // who
    expect(screen.getByText(/edit voucher V42/)).toBeInTheDocument(); // how
    // open alerts not shown on Fixed tab
    expect(screen.queryByText('Trial Balance not balanced')).not.toBeInTheDocument();
  });

  test('consolidated (All branches) view shows the branch-required message, no issues', () => {
    renderIt({ code: 'ALL' });
    expect(screen.getByText(/Select a branch to see its alerts/)).toBeInTheDocument();
    expect(screen.queryByText('Trial Balance not balanced')).not.toBeInTheDocument();
  });
});
