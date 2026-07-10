import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../api/limits', () => ({ getLimits: jest.fn(), setBranchLimits: jest.fn().mockResolvedValue({}), proposeBranchLimits: jest.fn().mockResolvedValue({}) }));
// eslint-disable-next-line import/first
import { LimitsAdmin } from '../LimitsAdmin';
// eslint-disable-next-line import/first
import { getLimits, setBranchLimits, proposeBranchLimits } from '../api/limits';

describe('LimitsAdmin (group default)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    try { localStorage.clear(); } catch { /* ignore */ }
    getLimits.mockResolvedValue({
      limits: { decisionThresholdINR: 500000, cashMaxPayment: 20000 },
      store: { default: { decisionThresholdINR: 500000, cashMaxPayment: 20000 }, branches: {} },
      defaults: {},
      fields: [
        { key: 'decisionThresholdINR', label: 'Decision → Owner (INR branches)', group: 'Decision stream', unit: '₹' },
        { key: 'cashMaxPayment', label: 'Max single cash payment', group: 'Cash', unit: '₹' },
      ],
    });
  });

  test('non-owner: editing files an Owner change-request for the group default', async () => {
    render(<LimitsAdmin />);
    const inp = await screen.findByLabelText('Decision → Owner (INR branches)');
    expect(inp).toHaveValue(500000);
    fireEvent.change(inp, { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: /submit changes for owner approval/i }));
    await waitFor(() => expect(proposeBranchLimits).toHaveBeenCalledWith('default', expect.objectContaining({ decisionThresholdINR: 1000000 })));
    expect(setBranchLimits).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent(/Owner approval/i);
  });

  test('owner: editing saves the group default LIVE', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    render(<LimitsAdmin />);
    const inp = await screen.findByLabelText('Max single cash payment');
    fireEvent.change(inp, { target: { value: '30000' } });
    fireEvent.click(screen.getByRole('button', { name: /save group-default thresholds/i }));
    await waitFor(() => expect(setBranchLimits).toHaveBeenCalledWith('default', expect.objectContaining({ cashMaxPayment: 30000 })));
    expect(proposeBranchLimits).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent(/applied live/i);
  });
});
