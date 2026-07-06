import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../api/limits', () => ({ getLimits: jest.fn(), proposeLimits: jest.fn().mockResolvedValue({}) }));
// eslint-disable-next-line import/first
import { LimitsAdmin } from '../LimitsAdmin';
// eslint-disable-next-line import/first
import { getLimits, proposeLimits } from '../api/limits';

describe('LimitsAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLimits.mockResolvedValue({
      limits: { decisionThresholdINR: 500000, cashMaxPayment: 20000 },
      fields: [
        { key: 'decisionThresholdINR', label: 'Decision → Owner (INR branches)', group: 'Decision stream', unit: '₹' },
        { key: 'cashMaxPayment', label: 'Max single cash payment', group: 'Cash', unit: '₹' },
      ],
    });
  });

  test('renders editable limits and files an Owner config change-request', async () => {
    render(<LimitsAdmin />);
    const inp = await screen.findByLabelText('Decision → Owner (INR branches)');
    expect(inp).toHaveValue(500000);
    fireEvent.change(inp, { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: /submit changes for owner approval/i }));
    await waitFor(() => expect(proposeLimits).toHaveBeenCalledWith(expect.objectContaining({ decisionThresholdINR: 1000000 })));
    expect(await screen.findByRole('status')).toHaveTextContent(/Owner approval/i);
  });
});
