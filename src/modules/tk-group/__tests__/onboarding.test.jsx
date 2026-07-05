import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../api/decisions', () => ({ submitDecision: jest.fn().mockResolvedValue({}), getMyDecisions: jest.fn() }));
// eslint-disable-next-line import/first
import { Onboarding } from '../Onboarding';
// eslint-disable-next-line import/first
import { submitDecision, getMyDecisions } from '../api/decisions';

describe('Onboarding', () => {
  beforeEach(() => { jest.clearAllMocks(); getMyDecisions.mockResolvedValue({ items: [] }); });

  test('files a counterparty decision with a composed onboarding note', async () => {
    render(<Onboarding />);
    fireEvent.change(screen.getByLabelText('Party name'), { target: { value: 'ACME Ltd' } });
    fireEvent.change(screen.getByLabelText('Credit limit'), { target: { value: '200000' } });
    fireEvent.change(screen.getByLabelText('Terms'), { target: { value: '30-day credit' } });
    fireEvent.click(screen.getByRole('button', { name: /submit onboarding/i }));
    await waitFor(() => expect(submitDecision).toHaveBeenCalledWith(expect.objectContaining({ type: 'counterparty', party: 'ACME Ltd', amount: 200000 })));
    expect(submitDecision.mock.calls[0][0].note).toMatch(/Client onboarding/);
    expect(await screen.findByRole('status')).toHaveTextContent(/submitted for Farhan \+ Owner approval/);
  });

  test('"my onboarding requests" shows only counterparty decisions', async () => {
    getMyDecisions.mockResolvedValue({ items: [
      { _id: '1', type: 'counterparty', status: 'pending', payload: { after: { party: 'New Co', note: 'Client onboarding' } } },
      { _id: '2', type: 'credit_limit', status: 'pending', payload: { after: { party: 'Other Co' } } },
    ] });
    render(<Onboarding />);
    expect(await screen.findByText('New Co')).toBeInTheDocument();
    expect(screen.queryByText('Other Co')).not.toBeInTheDocument();
  });
});
