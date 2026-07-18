import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../core/api', () => ({ isViewOnly: () => false, VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.', apiGet: jest.fn(() => Promise.resolve({})), apiPost: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../api/userLimits', () => ({
  getRoster: jest.fn(),
  getUserLimits: jest.fn(),
  setUserLimit: jest.fn(),
  proposeUserLimit: jest.fn().mockResolvedValue({}),
}));
// eslint-disable-next-line import/first
import { UserConfig } from '../UserConfig';
// eslint-disable-next-line import/first
import { getRoster, getUserLimits, setUserLimit, proposeUserLimit } from '../api/userLimits';

const ROSTER = [
  { id: '1', name: 'Faiz', email: 'faiz@travkings.com', role: 'Finance Manager', branches: ['BOM', 'NBO'], access: { erp: true, crm: false, app: false } },
  { id: '2', name: 'Sughra', email: 'sughra@travkings.com', role: 'Accounts Executive', branches: ['BOM'], access: { erp: true, crm: true, app: false } },
];
const STORE = { store: { 'faiz@travkings.com': { default: 500000, branches: { NBO: 6000 } } } };

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('UserConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    try { localStorage.clear(); } catch { /* ignore */ }
    getRoster.mockResolvedValue(ROSTER);
    getUserLimits.mockResolvedValue(STORE);
    setUserLimit.mockResolvedValue(STORE);
  });

  test('renders the real roster and seeds the ceiling for the branch (NBO override)', async () => {
    renderWith(<UserConfig branch="NBO" />);
    expect(await screen.findByText('Faiz')).toBeInTheDocument();
    expect(screen.getByText('Sughra')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Faiz approval ceiling')).toHaveValue(6000)); // NBO override
  });

  test('OWNER: Save writes the ceiling LIVE via setUserLimit(email, branch, value)', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<UserConfig branch="BOM" />);
    const inp = await screen.findByLabelText('Faiz approval ceiling');
    fireEvent.change(inp, { target: { value: '250000' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Save$/ })[0]);
    await waitFor(() => expect(setUserLimit).toHaveBeenCalledWith('faiz@travkings.com', 'BOM', 250000));
    expect(proposeUserLimit).not.toHaveBeenCalled();
  });

  test('NON-owner: Save PROPOSES via proposeUserLimit', async () => {
    renderWith(<UserConfig branch="default" />);
    const inp = await screen.findByLabelText('Sughra approval ceiling');
    fireEvent.change(inp, { target: { value: '80000' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Propose$/ })[1]);
    await waitFor(() => expect(proposeUserLimit).toHaveBeenCalledWith('sughra@travkings.com', 'default', 80000));
    expect(setUserLimit).not.toHaveBeenCalled();
  });

  test('rejects a negative ceiling before saving', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<UserConfig branch="default" />);
    const inp = await screen.findByLabelText('Faiz approval ceiling');
    fireEvent.change(inp, { target: { value: '-1' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Save$/ })[0]);
    expect(await screen.findByRole('status')).toHaveTextContent(/valid ceiling/i);
    expect(setUserLimit).not.toHaveBeenCalled();
  });
});
