import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { waitingRoles, statusLabel } from '../utils/changeRequests';
import { ChangeRequestList } from '../ChangeRequestList';

describe('changeRequest utils', () => {
  test('waitingRoles = chain roles not yet signed', () => {
    const cr = { chain: [{ role: 'Director' }, { role: 'Owner' }], approvals: [{ role: 'Director' }] };
    expect(waitingRoles(cr)).toEqual(['Owner']);
    expect(waitingRoles({ chain: [{ role: 'Director' }], approvals: [] })).toEqual(['Director']);
    expect(waitingRoles(undefined)).toEqual([]);
  });
  test('statusLabel maps known statuses', () => {
    expect(statusLabel('applied')).toBe('Applied');
    expect(statusLabel('pending')).toBe('Pending');
    expect(statusLabel('x')).toBe('x');
  });
});

describe('ChangeRequestList', () => {
  const items = [{ _id: 'cr1', type: 'period_lock', branch: 'BOM', maker: { name: 'Faiz' }, chain: [{ role: 'Director' }, { role: 'Owner' }], approvals: [{ role: 'Director' }] }];

  test('empty state', () => {
    render(<ChangeRequestList items={[]} />);
    expect(screen.getByText('No pending change-requests.')).toBeInTheDocument();
  });

  test('renders a request with type, maker and who it is waiting on', () => {
    render(<ChangeRequestList items={items} />);
    expect(screen.getByText('Period lock')).toBeInTheDocument();
    expect(screen.getByText(/Faiz/)).toBeInTheDocument();
    expect(screen.getByText(/waiting: Owner/)).toBeInTheDocument();
  });

  test('Approve / Reject buttons call onAct with the id and action', () => {
    const onAct = jest.fn();
    render(<ChangeRequestList items={items} onAct={onAct} />);
    fireEvent.click(screen.getByText('Approve'));
    expect(onAct).toHaveBeenCalledWith('cr1', 'approve');
    fireEvent.click(screen.getByText('Reject'));
    expect(onAct).toHaveBeenCalledWith('cr1', 'reject');
  });
});
