import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../api/changeRequests', () => ({
  getChangeRequests: jest.fn(),
  actOnChangeRequest: jest.fn().mockResolvedValue({}),
}));

const { getChangeRequests, actOnChangeRequest } = require('../api/changeRequests');
const { ApprovalsInbox } = require('../ApprovalsInbox');

const item = { _id: 'cr1', type: 'period_lock', branch: 'BOM', maker: { name: 'Faiz' }, chain: [{ role: 'Director' }, { role: 'Owner' }], approvals: [{ role: 'Director' }] };

beforeEach(() => {
  jest.clearAllMocks();
  getChangeRequests.mockResolvedValue([item]);
  window.confirm = jest.fn(() => true);
  window.prompt = jest.fn(() => 'looks wrong');
});

test('loads and lists pending change-requests', async () => {
  render(<ApprovalsInbox />);
  expect(await screen.findByText('Period lock')).toBeInTheDocument();
  expect(getChangeRequests).toHaveBeenCalledWith('pending');
});

test('approve → confirms, then calls the API with approve', async () => {
  render(<ApprovalsInbox />);
  fireEvent.click(await screen.findByText('Approve'));
  await waitFor(() => expect(actOnChangeRequest).toHaveBeenCalledWith('cr1', 'approve', ''));
});

test('approve cancelled at the confirm → no API call', async () => {
  window.confirm = jest.fn(() => false);
  render(<ApprovalsInbox />);
  fireEvent.click(await screen.findByText('Approve'));
  await waitFor(() => expect(getChangeRequests).toHaveBeenCalled());
  expect(actOnChangeRequest).not.toHaveBeenCalled();
});

test('reject → collects a reason and sends it', async () => {
  render(<ApprovalsInbox />);
  fireEvent.click(await screen.findByText('Reject'));
  await waitFor(() => expect(actOnChangeRequest).toHaveBeenCalledWith('cr1', 'reject', 'looks wrong'));
});

test('reject with empty/cancelled reason → aborts, no API call', async () => {
  window.prompt = jest.fn(() => '');
  render(<ApprovalsInbox />);
  fireEvent.click(await screen.findByText('Reject'));
  await waitFor(() => expect(getChangeRequests).toHaveBeenCalled());
  expect(actOnChangeRequest).not.toHaveBeenCalled();
});

test('API error is surfaced, list stays usable', async () => {
  actOnChangeRequest.mockRejectedValueOnce(new Error('Blocked by TK Group control'));
  render(<ApprovalsInbox />);
  fireEvent.click(await screen.findByText('Approve'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Blocked by TK Group control');
});
