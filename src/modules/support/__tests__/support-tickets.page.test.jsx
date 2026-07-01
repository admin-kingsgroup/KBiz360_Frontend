// Support Tickets page — renders the board from server state, opens the raise-a-
// ticket dialog, and submits with the auto-captured route context.
// (jest.mock factories may only reference vars prefixed `mock`.)
const mockCreate = jest.fn();
const mockRows = [
  { id: 't1', ref: 'TKT-00001', title: 'Export crashes on big range', type: 'bug', priority: 'high', status: 'open', raisedBy: 'a@co.com', raisedByName: 'Asha', createdAt: '2026-06-30T10:00:00Z' },
  { id: 't2', ref: 'TKT-00002', title: 'Add dark mode', type: 'feature', priority: 'low', status: 'in_progress', raisedBy: 'b@co.com', raisedByName: 'Ben', createdAt: '2026-06-29T09:00:00Z' },
];

jest.mock('../hooks/use-tickets', () => ({
  useTickets: () => ({ data: mockRows, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useTicketSummary: () => ({ data: { total: 2, mine: 1, byStatus: { open: 1 }, byType: {} } }),
  useCreateTicket: () => ({ mutate: mockCreate, isPending: false }),
  useUpdateTicket: () => ({ mutate: jest.fn(), isPending: false }),
  useAddComment: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteTicket: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('../../../core/ux/toast', () => ({ toastSuccess: jest.fn(), toastError: jest.fn() }));

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SupportTicketsPage } from '../pages/support-tickets';

describe('SupportTicketsPage', () => {
  beforeEach(() => { mockCreate.mockReset(); });

  test('lists tickets from server state with their ref + title', () => {
    render(<SupportTicketsPage route="/reports/pnl" />);
    expect(screen.getByText('TKT-00001')).toBeInTheDocument();
    expect(screen.getByText('Export crashes on big range')).toBeInTheDocument();
    expect(screen.getByText('Add dark mode')).toBeInTheDocument();
    // Status/type pills render their human labels.
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Feature request')).toBeInTheDocument();
  });

  test('"Raise ticket" opens the create dialog and submits with the captured route + module', () => {
    render(<SupportTicketsPage route="/reports/pnl" />);
    fireEvent.click(screen.getByRole('button', { name: /raise ticket/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/raise a support ticket/i)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByPlaceholderText(/Trial Balance export crashes/i), {
      target: { value: 'Nav is broken' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /^raise ticket$/i }));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const body = mockCreate.mock.calls[0][0];
    expect(body).toMatchObject({ title: 'Nav is broken', type: 'bug', pageUrl: '/reports/pnl', module: 'Reports' });
  });

  test('title is required — empty submit does not call create', () => {
    render(<SupportTicketsPage route="/dashboard" />);
    fireEvent.click(screen.getByRole('button', { name: /raise ticket/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^raise ticket$/i }));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/a short title is required/i)).toBeInTheDocument();
  });
});
