// Scrutiny Dashboard: Overview (scores / area breakdown / data-capture / trend /
// branch comparison) + Open Issues (domain-grouped, auto, no Finish) + Fixed
// (audit trail). Branch-specific. useAccounting/toast/navFocus mocked.

jest.mock('../../../core/api', () => ({ apiGet: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../../../core/ux/navFocus', () => ({ setNavFocus: jest.fn() }));
jest.mock('../../../core/ux/toast', () => ({ toastInfo: jest.fn() }));

const mockBRANCH = {
  generatedAt: new Date().toISOString(),
  branchRequired: false,
  counts: { error: 1, warn: 1, info: 1 },
  statusCounts: { open: 3, fixed: 1 },
  domains: [{ key: 'acct', label: 'Accounting', pending: 1 }, { key: 'recon', label: 'Reconciliation', pending: 1 }, { key: 'tax', label: 'Tax', pending: 1 }],
  analytics: {
    score: 70, exposure: 50000,
    areas: [
      { key: 'acct', label: 'Accounting', open: 1, error: 1, warn: 0, info: 0, exposure: 500, score: 85 },
      { key: 'recon', label: 'Reconciliation', open: 1, error: 0, warn: 1, info: 0, exposure: 0, score: 93 },
      { key: 'tax', label: 'Tax', open: 1, error: 0, warn: 0, info: 1, exposure: 0, score: 97 },
    ],
    dataCapture: { unposted: 0, pendingApproval: 0, missingMasters: 0, idleLedgers: 0, unreconciled: 12, issues: 1, score: 93 },
  },
  alerts: [
    { key: 'tb:BOM', type: 'tb-unbalanced', domain: 'acct', severity: 'error', title: 'Trial Balance not balanced', detail: 'out by 500', link: '/trial-balance' },
    { key: 'rb:BOM', type: 'recon-bank', domain: 'recon', severity: 'warn', title: 'Bank statement reconciliation pending', detail: '12 open', link: '/bank-reco' },
    { key: 'gst:BOM', type: 'gst-payable', domain: 'tax', severity: 'info', title: 'GST payable outstanding', detail: 'deposit & file', link: '/tax/gstr3b' },
  ],
  resolved: [
    { alertKey: 'sus:BOM', type: 'suspense', severity: 'error', title: 'Suspense balance', detail: 'was 12,000', firstSeenAt: '2026-06-22T00:00:00Z', resolvedAt: '2026-06-23T10:00:00Z', openMs: 34 * 3600000, resolvedBy: 'ravi@kbiz', resolvedHow: 'edit voucher V42', link: '/trial-balance' },
  ],
};
const mockGROUP = { branchRequired: true, counts: { error: 0, warn: 0, info: 0 }, statusCounts: { open: 0, fixed: 0 }, domains: [], analytics: { score: 100, areas: [], dataCapture: {} }, alerts: [], resolved: [] };
jest.mock('../../../core/useAccounting', () => ({
  useAlerts: (b) => ({ data: (b && b.code === 'ALL') ? mockGROUP : mockBRANCH, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() }),
  useAlertTrend: () => ({ data: { weeks: [{ weekStart: '2026-06-17', opened: 2, fixed: 1 }], avgFixHrs: 5, openNow: 3, fixedTotal: 1 }, refetch: jest.fn() }),
  useAlertsByBranch: () => ({ data: [{ branch: 'BOM', open: 3, critical: 1, warning: 1, exposure: 50000 }, { branch: 'AMD', open: 1, critical: 0, warning: 1, exposure: 2000 }], refetch: jest.fn() }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertsDashboard } from '../pages/alerts-dashboard';

const renderIt = (branch = { code: 'BOM' }) => render(<AlertsDashboard branch={branch} setRoute={jest.fn()} />);

describe('Scrutiny Dashboard', () => {
  test('Overview is the default tab: score, areas, data-capture, trend, branches', () => {
    renderIt();
    expect(screen.getByText('Scrutiny score')).toBeInTheDocument();
    expect(screen.getByText('Scrutiny by area')).toBeInTheDocument();
    expect(screen.getByText('Data-capture completeness')).toBeInTheDocument();
    expect(screen.getByText(/Issues opened vs fixed/)).toBeInTheDocument();
    expect(screen.getByText('Open issues by branch')).toBeInTheDocument();
    // branch comparison shows both branches
    expect(screen.getByText('AMD')).toBeInTheDocument();
    // the open issue list is NOT shown on Overview
    expect(screen.queryByText('Trial Balance not balanced')).not.toBeInTheDocument();
  });

  test('an area card drills into the Open Issues tab filtered to that area', () => {
    renderIt();
    fireEvent.click(screen.getByText('Reconciliation'));     // area card
    expect(screen.getByText('Bank statement reconciliation pending')).toBeInTheDocument();
    expect(screen.queryByText('Trial Balance not balanced')).not.toBeInTheDocument(); // filtered out
  });

  test('Open Issues tab groups alerts by domain; no Finish action', () => {
    renderIt();
    fireEvent.click(screen.getByText(/Open Issues/));
    expect(screen.getByText('Trial Balance not balanced')).toBeInTheDocument();
    expect(screen.queryByText('Finish')).not.toBeInTheDocument();
    expect(screen.queryByText('Remind')).not.toBeInTheDocument();
  });

  test('severity KPI strip filters the Open list', () => {
    renderIt();
    fireEvent.click(screen.getByText(/Open Issues/));
    fireEvent.click(screen.getByRole('button', { name: /Critical/ }));
    expect(screen.getByText('Trial Balance not balanced')).toBeInTheDocument();
    expect(screen.queryByText('GST payable outstanding')).not.toBeInTheDocument();
  });

  test('Fixed tab shows the audit trail (what / how long / by whom)', () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: /Fixed/ }));
    expect(screen.getByText('Suspense balance')).toBeInTheDocument();
    expect(screen.getByText(/open for/)).toBeInTheDocument();
    expect(screen.getByText('ravi@kbiz')).toBeInTheDocument();
    expect(screen.getByText(/edit voucher V42/)).toBeInTheDocument();
  });

  test('consolidated (All branches) view asks to pick a branch', () => {
    renderIt({ code: 'ALL' });
    expect(screen.getByText(/Select a branch to scrutinise/)).toBeInTheDocument();
    expect(screen.queryByText('Scrutiny by area')).not.toBeInTheDocument();
  });
});
