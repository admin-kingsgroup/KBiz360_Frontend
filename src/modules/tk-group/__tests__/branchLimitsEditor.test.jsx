import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../core/api', () => ({ isViewOnly: () => false, VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.', apiGet: jest.fn(() => Promise.resolve({})), apiPost: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../api/limits', () => ({
  getLimits: jest.fn(),
  setBranchLimits: jest.fn(),
  proposeBranchLimits: jest.fn().mockResolvedValue({}),
}));
// eslint-disable-next-line import/first
import { BranchLimitsEditor } from '../BranchLimitsEditor';
// eslint-disable-next-line import/first
import { getLimits, setBranchLimits, proposeBranchLimits } from '../api/limits';

const DATA = {
  fields: [
    { key: 'cashMaxPayment', label: 'Max single cash payment', group: 'Cash', unit: '₹' },
    { key: 'voucherDual', label: 'Voucher needs Owner above', group: 'Voucher stream', unit: '₹' },
  ],
  defaults: { cashMaxPayment: 20000, voucherDual: 1500000 },
  store: { default: { cashMaxPayment: 30000 }, branches: { BOM: { cashMaxPayment: 8000 } } },
  limits: {},
};

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('BranchLimitsEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    try { localStorage.clear(); } catch { /* ignore */ }
    getLimits.mockResolvedValue(DATA);
    setBranchLimits.mockResolvedValue(DATA);
  });

  test('shows the branch selector and seeds a branch override into the field', async () => {
    renderWith(<BranchLimitsEditor />);
    // BOM has an override; clicking it seeds 8000 into the cash field
    fireEvent.click(await screen.findByRole('tab', { name: /^BOM\b/ }));
    await waitFor(() => expect(screen.getByLabelText('Max single cash payment')).toHaveValue(8000));
  });

  test('OWNER: editing a branch saves LIVE via setBranchLimits(branch, values)', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<BranchLimitsEditor />);
    fireEvent.click(await screen.findByRole('tab', { name: /^AMD/ }));
    const inp = await screen.findByLabelText('Max single cash payment');
    fireEvent.change(inp, { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /save amd thresholds/i }));
    await waitFor(() => expect(setBranchLimits).toHaveBeenCalledWith('AMD', expect.objectContaining({ cashMaxPayment: 5000 })));
    expect(proposeBranchLimits).not.toHaveBeenCalled();
  });

  test('NON-owner: editing a branch PROPOSES via proposeBranchLimits', async () => {
    renderWith(<BranchLimitsEditor />);
    fireEvent.click(await screen.findByRole('tab', { name: /^NBO/ }));
    const inp = await screen.findByLabelText('Max single cash payment');
    fireEvent.change(inp, { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: /submit nbo for approval/i }));
    await waitFor(() => expect(proposeBranchLimits).toHaveBeenCalledWith('NBO', expect.objectContaining({ cashMaxPayment: 900 })));
    expect(setBranchLimits).not.toHaveBeenCalled();
  });

  test('rejects a negative value before saving', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<BranchLimitsEditor />);
    const inp = await screen.findByLabelText('Max single cash payment');
    fireEvent.change(inp, { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /save group default thresholds/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/valid number/i);
    expect(setBranchLimits).not.toHaveBeenCalled();
  });
});
