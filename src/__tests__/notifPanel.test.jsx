// Bell dropdown + Notification Centre, driven by the live alert feed. Alerts are
// branch-specific and auto-resolve (Open → Fixed); there is NO manual finish.
// useAccounting (network) + navFocus are mocked.

const mockSetNavFocus = jest.fn();
jest.mock('../core/api', () => ({ apiGet: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/ux/navFocus', () => ({ setNavFocus: (...a) => mockSetNavFocus(...a) }));
jest.mock('../core/ux/focus', () => ({ useFocusTrap: () => {} }));
jest.mock('../core/ux/modalStore', () => ({ pushModal: () => () => {} }));

const mockBRANCH = {
  branchRequired: false,
  counts: { error: 1, warn: 1, info: 0 },
  statusCounts: { open: 2, fixed: 1 },
  domains: [{ key: 'acct', label: 'Accounting', pending: 1 }, { key: 'treasury', label: 'Treasury', pending: 1 }],
  alerts: [
    { key: 'tb:BOM', type: 'tb-unbalanced', domain: 'acct', severity: 'error', title: 'Trial Balance not balanced', detail: 'out by 500', link: '/trial-balance' },
    { key: 'pdc:BOM', type: 'pdc-bounced', domain: 'treasury', severity: 'warn', title: 'Bounced cheques', detail: '1 bounced', link: '/accounts/collections' },
  ],
  resolved: [
    { alertKey: 'gst:BOM', type: 'gst-payable', severity: 'info', title: 'GST payable outstanding', detail: 'deposit & file', firstSeenAt: '2026-06-22T00:00:00Z', resolvedAt: '2026-06-23T10:00:00Z', openMs: 34 * 3600000, resolvedBy: 'asha@kbiz', resolvedHow: 'edit voucher V9', link: '/tax/gstr3b' },
  ],
};
const mockGROUP = { branchRequired: true, counts: { error: 0, warn: 0, info: 0 }, statusCounts: { open: 0, fixed: 0 }, domains: [], alerts: [], resolved: [] };
jest.mock('../core/useAccounting', () => ({
  branchCode: (b) => (b === 'ALL' || !b ? undefined : (b.code || b)),
  useAlerts: (b) => ({ data: (b && b.code === 'ALL') ? mockGROUP : mockBRANCH, isLoading: false, isError: false, isFetching: false }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotifPanel, NotificationCentre } from '../shell/NotifPanel';

beforeEach(() => { mockSetNavFocus.mockClear(); });

describe('NotifPanel (bell dropdown)', () => {
  test('renders live open alerts with counts', () => {
    render(<NotifPanel branch={{ code: 'BOM' }} onClose={() => {}} setRoute={() => {}} />);
    expect(screen.getByText('Trial Balance not balanced')).toBeInTheDocument();
    expect(screen.getByText('Bounced cheques')).toBeInTheDocument();
    expect(screen.getByText(/2 open/)).toBeInTheDocument();
  });

  test('no manual Finish action exists', () => {
    render(<NotifPanel branch={{ code: 'BOM' }} onClose={() => {}} setRoute={() => {}} />);
    expect(screen.queryByText('Finish')).not.toBeInTheDocument();
  });

  test('Open & fix deep-links via setNavFocus + setRoute and closes', () => {
    const setRoute = jest.fn(); const onClose = jest.fn();
    render(<NotifPanel branch={{ code: 'BOM' }} onClose={onClose} setRoute={setRoute} />);
    fireEvent.click(screen.getAllByText(/Open & fix/)[0]);
    expect(mockSetNavFocus).toHaveBeenCalledWith('/trial-balance', expect.anything());
    expect(setRoute).toHaveBeenCalledWith('/trial-balance');
    expect(onClose).toHaveBeenCalled();
  });

  test('footer opens the Alerts Dashboard', () => {
    const setRoute = jest.fn();
    render(<NotifPanel branch={{ code: 'BOM' }} onClose={() => {}} setRoute={setRoute} />);
    fireEvent.click(screen.getByText(/Open Alerts Dashboard/));
    expect(setRoute).toHaveBeenCalledWith('/dashboard/alerts');
  });

  test('consolidated (ALL) view asks to pick a branch', () => {
    render(<NotifPanel branch={{ code: 'ALL' }} onClose={() => {}} setRoute={() => {}} />);
    expect(screen.getByText(/Pick a branch/)).toBeInTheDocument();
    expect(screen.queryByText('Trial Balance not balanced')).not.toBeInTheDocument();
  });
});

describe('NotificationCentre (full page)', () => {
  test('Open tab lists live alerts; Fixed tab shows the audit trail', () => {
    render(<NotificationCentre branch={{ code: 'BOM' }} setRoute={() => {}} />);
    expect(screen.getByText('Trial Balance not balanced')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Fixed/));
    expect(screen.getByText('GST payable outstanding')).toBeInTheDocument();
    expect(screen.getByText('asha@kbiz')).toBeInTheDocument();
    expect(screen.getByText(/edit voucher V9/)).toBeInTheDocument();
    expect(screen.queryByText('Trial Balance not balanced')).not.toBeInTheDocument();
  });

  test('consolidated view shows the branch-required message', () => {
    render(<NotificationCentre branch={{ code: 'ALL' }} setRoute={() => {}} />);
    expect(screen.getByText(/Select a branch to see its alerts/)).toBeInTheDocument();
  });
});
