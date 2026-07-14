import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { approverHint, isDecisionValid, decisionTypeDef, DECISION_THRESHOLD } from '../utils/decisions';
import { DecisionRequestForm } from '../DecisionRequestForm';

// api/decisions pulls core/api (import.meta) → mock for the container test.
jest.mock('../api/decisions', () => ({ submitDecision: jest.fn().mockResolvedValue({}), getMyDecisions: jest.fn() }));
// eslint-disable-next-line import/first
import { DecisionsBoard } from '../approvals/DecisionsBoard';
// eslint-disable-next-line import/first
import { submitDecision, getMyDecisions } from '../api/decisions';

describe('decision utils', () => {
  test('approverHint: small → Farhan; large → Farhan + Owner; onboarding always dual', () => {
    expect(approverHint('credit_limit', 100000)).toBe('Farhan');
    expect(approverHint('credit_limit', DECISION_THRESHOLD + 1)).toBe('Farhan + Owner');
    expect(approverHint('counterparty', 0)).toBe('Farhan + Owner');
  });
  test('isDecisionValid: party always required; amount required only for amount types', () => {
    expect(isDecisionValid({ type: 'credit_limit', party: 'ACME', amount: 100 })).toBe(true);
    expect(isDecisionValid({ type: 'credit_limit', party: 'ACME', amount: 0 })).toBe(false);
    expect(isDecisionValid({ type: 'counterparty', party: 'New Co', amount: 0 })).toBe(true);
    expect(isDecisionValid({ type: 'counterparty', party: '' })).toBe(false);
    expect(isDecisionValid({ type: 'nope', party: 'x' })).toBe(false);
  });
  test('decisionTypeDef resolves known keys', () => {
    expect(decisionTypeDef('funds_release').amount).toBe(true);
    expect(decisionTypeDef('counterparty').amount).toBe(false);
  });
});

describe('DecisionRequestForm', () => {
  test('submit disabled until valid; fires onSubmit with the shaped payload', () => {
    const onSubmit = jest.fn();
    render(<DecisionRequestForm onSubmit={onSubmit} />);
    const btn = screen.getByRole('button', { name: /submit decision/i });
    expect(btn).toBeDisabled();                                   // credit_limit needs party + amount
    fireEvent.change(screen.getByLabelText('Party'), { target: { value: 'ACME Ltd' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '750000' } });
    expect(screen.getByTestId('tk-approver-hint')).toHaveTextContent('Farhan + Owner'); // above threshold
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onSubmit).toHaveBeenCalledWith({ type: 'credit_limit', party: 'ACME Ltd', amount: 750000, note: '' });
  });
});

describe('DecisionsBoard container', () => {
  beforeEach(() => { jest.clearAllMocks(); getMyDecisions.mockResolvedValue({ items: [{ _id: '1', type: 'credit_limit', status: 'pending', payload: { after: { party: 'ACME', amount: 200000 } } }] }); });
  test('lists my requests and files a new decision on submit', async () => {
    render(<DecisionsBoard />);
    expect(await screen.findByText('ACME')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Party'), { target: { value: 'Beta Co' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: /submit decision/i }));
    await waitFor(() => expect(submitDecision).toHaveBeenCalledWith(expect.objectContaining({ party: 'Beta Co', amount: 50000 })));
    expect(await screen.findByRole('status')).toHaveTextContent(/submitted for approval/i);
  });
});
