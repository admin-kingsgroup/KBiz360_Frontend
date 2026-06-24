// Alerts Dashboard UI organization: severity KPI strip (also the severity filter),
// status tabs, tab-aware domain chips, and the list grouped into domain sections.
// useAccounting (network) + toast/navFocus are mocked.

const mockSetStatus = jest.fn();
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(), apiPut: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../../../core/ux/navFocus', () => ({ setNavFocus: jest.fn() }));
jest.mock('../../../core/ux/toast', () => ({ toastInfo: jest.fn(), toastSuccess: jest.fn(), toastError: jest.fn() }));

const mockDATA = {
  generatedAt: new Date().toISOString(),
  counts: { error: 1, warn: 1, info: 1 },
  statusCounts: { pending: 3, remind: 0, finished: 1 },
  domains: [{ key: 'acct', label: 'Accounting', pending: 1 }, { key: 'recon', label: 'Reconciliation', pending: 1 }, { key: 'tax', label: 'Tax', pending: 1 }],
  alerts: [
    { key: 'tb:BOM', type: 'tb-unbalanced', domain: 'acct', severity: 'error', status: 'pending', title: 'Trial Balance not balanced', detail: 'out by 500', signature: 's1', magnitude: 1, link: '/trial-balance' },
    { key: 'rb:BOM', type: 'recon-bank', domain: 'recon', severity: 'warn', status: 'pending', title: 'Bank statement reconciliation pending', detail: '12 open', signature: 's2', magnitude: 12, link: '/bank-reco' },
    { key: 'gst:BOM', type: 'gst-payable', domain: 'tax', severity: 'info', status: 'pending', title: 'GST payable outstanding', detail: 'deposit & file', signature: 's3', magnitude: 1, link: '/tax/gstr3b' },
    { key: 'done:BOM', type: 'suspense', domain: 'acct', severity: 'error', status: 'finished', title: 'Suspense balance', detail: 'cleared', signature: 's4', magnitude: 1, link: '/trial-balance' },
  ],
};
jest.mock('../../../core/useAccounting', () => ({
  useAlerts: () => ({ data: mockDATA, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() }),
  useSetAlertStatus: () => ({ mutate: mockSetStatus }),
}));

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AlertsDashboard } from '../pages/alerts-dashboard';

const renderIt = () => render(<AlertsDashboard branch={{ code: 'BOM' }} setRoute={jest.fn()} />);

describe('Alerts Dashboard — organized layout', () => {
  test('renders domain section headers for the pending alerts', () => {
    renderIt();
    // each domain label shows as a filter chip AND a section header
    expect(screen.getAllByText('Accounting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reconciliation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tax').length).toBeGreaterThan(0);
    // and the cards under them
    expect(screen.getByText('Trial Balance not balanced')).toBeInTheDocument();
    expect(screen.getByText('Bank statement reconciliation pending')).toBeInTheDocument();
  });

  test('severity KPI strip filters the list', () => {
    renderIt();
    // Click the "Critical" KPI card → only the error alert remains
    fireEvent.click(screen.getByRole('button', { name: /Critical/ }));
    expect(screen.getByText('Trial Balance not balanced')).toBeInTheDocument();
    expect(screen.queryByText('GST payable outstanding')).not.toBeInTheDocument();
    expect(screen.queryByText('Bank statement reconciliation pending')).not.toBeInTheDocument();
  });

  test('switching to Finished tab shows finished alerts only', () => {
    renderIt();
    fireEvent.click(screen.getByText(/Finished/));
    expect(screen.getByText('Suspense balance')).toBeInTheDocument();
    expect(screen.queryByText('Trial Balance not balanced')).not.toBeInTheDocument();
  });

  test('domain chip narrows to one section', () => {
    renderIt();
    // The "Reconciliation" chip appears both as a chip and a section header; click the chip
    const reconChips = screen.getAllByText('Reconciliation');
    fireEvent.click(reconChips[0]);
    expect(screen.getByText('Bank statement reconciliation pending')).toBeInTheDocument();
    expect(screen.queryByText('Trial Balance not balanced')).not.toBeInTheDocument();
  });

  test('Finish action fires the lifecycle mutation', () => {
    renderIt();
    const card = screen.getByText('Trial Balance not balanced').closest('div.flex-col');
    fireEvent.click(within(card).getByText('Finish'));
    expect(mockSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({ alertKey: 'tb:BOM', status: 'finished' }),
      expect.anything(),
    );
  });
});
