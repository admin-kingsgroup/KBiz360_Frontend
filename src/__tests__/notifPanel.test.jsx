// The header bell dropdown + Notification Centre are driven by the LIVE alert feed.
// useAccounting (network) and toast/navFocus side-effects are mocked so we assert
// the wiring: live alerts render, "Open" deep-links via setNavFocus + setRoute,
// "Finish" calls the lifecycle mutation, and "View all" jumps to the dashboard.

const mockMutate = jest.fn();
const mockSetNavFocus = jest.fn();
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPut: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/ux/navFocus', () => ({ setNavFocus: (...a) => mockSetNavFocus(...a) }));
jest.mock('../core/ux/toast', () => ({ toastSuccess: jest.fn(), toastError: jest.fn() }));
jest.mock('../core/ux/focus', () => ({ useFocusTrap: () => {} }));
jest.mock('../core/ux/modalStore', () => ({ pushModal: () => () => {} }));

const mockALERTS = {
  generatedAt: new Date().toISOString(),
  counts: { error: 1, warn: 1, info: 0 },
  statusCounts: { pending: 2, remind: 0, finished: 0 },
  domains: [{ key: 'acct', label: 'Accounting', pending: 1 }, { key: 'treasury', label: 'Treasury', pending: 1 }],
  alerts: [
    { key: 'tb-unbalanced:BOM', type: 'tb-unbalanced', domain: 'acct', severity: 'error', status: 'pending', title: 'Trial Balance not balanced', detail: 'out by ₹500', signature: 'out=500', magnitude: 500, link: '/trial-balance' },
    { key: 'pdc-bounced:BOM', type: 'pdc-bounced', domain: 'treasury', severity: 'warn', status: 'pending', title: 'Bounced cheques', detail: '1 cheque bounced', signature: 'n=1', magnitude: 1, link: '/accounts/collections' },
  ],
};
jest.mock('../core/useAccounting', () => ({
  branchCode: (b) => (b === 'ALL' || !b ? undefined : (b.code || b)),
  useAlerts: () => ({ data: mockALERTS, isLoading: false, isError: false, isFetching: false }),
  useSetAlertStatus: () => ({ mutate: mockMutate }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotifPanel, NotificationCentre } from '../shell/NotifPanel';

beforeEach(() => { mockMutate.mockClear(); mockSetNavFocus.mockClear(); });

describe('NotifPanel (bell dropdown)', () => {
  test('renders live pending alerts with counts', () => {
    render(<NotifPanel branch={{ code: 'BOM' }} onClose={() => {}} setRoute={() => {}} />);
    expect(screen.getByText('Trial Balance not balanced')).toBeInTheDocument();
    expect(screen.getByText('Bounced cheques')).toBeInTheDocument();
    expect(screen.getByText(/2 open/)).toBeInTheDocument();
  });

  test('Open deep-links via setNavFocus + setRoute and closes', () => {
    const setRoute = jest.fn();
    const onClose = jest.fn();
    render(<NotifPanel branch={{ code: 'BOM' }} onClose={onClose} setRoute={setRoute} />);
    fireEvent.click(screen.getAllByText('Open')[0]);
    expect(mockSetNavFocus).toHaveBeenCalledWith('/trial-balance', expect.anything());
    expect(setRoute).toHaveBeenCalledWith('/trial-balance');
    expect(onClose).toHaveBeenCalled();
  });

  test('Finish fires the lifecycle mutation with the alert signature', () => {
    render(<NotifPanel branch={{ code: 'BOM' }} onClose={() => {}} setRoute={() => {}} />);
    fireEvent.click(screen.getAllByText('Finish')[0]);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ alertKey: 'tb-unbalanced:BOM', branch: 'BOM', status: 'finished', signature: 'out=500' }),
      expect.anything(),
    );
  });

  test('View all jumps to the Alerts Dashboard', () => {
    const setRoute = jest.fn();
    render(<NotifPanel branch={{ code: 'BOM' }} onClose={() => {}} setRoute={setRoute} />);
    fireEvent.click(screen.getByText(/View all alerts/));
    expect(setRoute).toHaveBeenCalledWith('/dashboard/alerts');
  });
});

describe('NotificationCentre (full page)', () => {
  test('renders live alerts and filters by backend domain', () => {
    render(<NotificationCentre branch={{ code: 'BOM' }} setRoute={() => {}} />);
    // both alerts present under the default Pending tab
    expect(screen.getByText('Trial Balance not balanced')).toBeInTheDocument();
    expect(screen.getByText('Bounced cheques')).toBeInTheDocument();
    // domain chip from the backend summary
    fireEvent.click(screen.getByText(/Treasury/));
    expect(screen.queryByText('Trial Balance not balanced')).not.toBeInTheDocument();
    expect(screen.getByText('Bounced cheques')).toBeInTheDocument();
  });
});
