import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../core/api', () => ({ isViewOnly: () => false, VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.', apiGet: jest.fn(() => Promise.resolve({})), apiPost: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../api/delegation', () => ({ getDelegations: jest.fn(), createDelegation: jest.fn().mockResolvedValue({}), revokeDelegation: jest.fn().mockResolvedValue({}) }));
jest.mock('../api/userLimits', () => ({ getRoster: jest.fn().mockResolvedValue([{ email: 'sughra@travkings.com', name: 'Sughra', role: 'Accounts Executive' }]) }));
// eslint-disable-next-line import/first
import { Delegation } from '../Delegation';
// eslint-disable-next-line import/first
import { getDelegations, createDelegation, revokeDelegation } from '../api/delegation';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('Delegation', () => {
  beforeEach(() => { jest.clearAllMocks(); try { localStorage.clear(); } catch { /* ignore */ } });

  test('OWNER: grants a delegation via createDelegation', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    getDelegations.mockResolvedValue({ items: [] });
    renderWith(<Delegation />);
    await screen.findAllByRole('option', { name: /Sughra/ });   // wait for the roster options to load
    fireEvent.change(screen.getByLabelText('Delegate'), { target: { value: 'sughra@travkings.com' } });
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-07-10' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-07-15' } });
    fireEvent.click(screen.getByRole('button', { name: /Grant delegation/ }));
    await waitFor(() => expect(createDelegation).toHaveBeenCalledWith(expect.objectContaining({ toEmail: 'sughra@travkings.com', from: '2026-07-10', to: '2026-07-15' })));
  });

  test('validates reversed dates before submit', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    getDelegations.mockResolvedValue({ items: [] });
    renderWith(<Delegation />);
    await screen.findAllByRole('option', { name: /Sughra/ });   // wait for the roster options to load
    fireEvent.change(screen.getByLabelText('Delegate'), { target: { value: 'sughra@travkings.com' } });
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-07-20' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-07-10' } });
    fireEvent.click(screen.getByRole('button', { name: /Grant delegation/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(/end date cannot be before/i);
    expect(createDelegation).not.toHaveBeenCalled();
  });

  test('OWNER: revokes an active delegation', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    getDelegations.mockResolvedValue({ items: [{ id: 'DG1', toEmail: 'sughra@travkings.com', scope: 'approve', branch: null, from: '2026-07-10', to: '2026-07-20', active: true, revokedAt: null }] });
    renderWith(<Delegation />);
    fireEvent.click(await screen.findByRole('button', { name: /Revoke/ }));
    await waitFor(() => expect(revokeDelegation).toHaveBeenCalledWith('DG1'));
  });

  test('non-owner sees no grant form', async () => {
    getDelegations.mockResolvedValue({ items: [] });
    renderWith(<Delegation />);
    expect(await screen.findByText(/Only the Owner grants delegations/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Grant delegation/ })).not.toBeInTheDocument();
  });
});
