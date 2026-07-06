import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { flagRows, withToggled } from '../utils/flags';
import { FlagPanel } from '../FlagPanel';

// api/flags pulls in core/api (Vite import.meta) → mock it for the container test.
jest.mock('../api/flags', () => ({ getFlagState: jest.fn(), proposeFlags: jest.fn().mockResolvedValue({}) }));
// eslint-disable-next-line import/first
import { FlagAdmin } from '../FlagAdmin';
// eslint-disable-next-line import/first
import { getFlagState, proposeFlags } from '../api/flags';

const state = {
  flags: {
    'core.policy_guard': { foundation: true },
    'branch.hide_statements': { enabled: false, scope: 'role' },
    'branch.pending_by_default': { enabled: true, scope: 'global' },
  },
};

describe('flag utils', () => {
  test('flagRows: sorted; foundation reads ON', () => {
    const rows = flagRows(state);
    expect(rows.map((r) => r.key)).toEqual(['branch.hide_statements', 'branch.pending_by_default', 'core.policy_guard']);
    expect(rows.find((r) => r.key === 'core.policy_guard')).toMatchObject({ enabled: true, foundation: true });
    expect(rows.find((r) => r.key === 'branch.hide_statements').enabled).toBe(false);
  });
  test('withToggled flips a normal flag, never a foundation one', () => {
    expect(withToggled(state, 'branch.hide_statements')['branch.hide_statements'].enabled).toBe(true);
    expect(withToggled(state, 'core.policy_guard')['core.policy_guard'].foundation).toBe(true); // unchanged
  });
});

describe('FlagPanel', () => {
  test('renders switches; foundation is disabled', () => {
    render(<FlagPanel rows={flagRows(state)} />);
    expect(screen.getByLabelText('core.policy_guard')).toBeDisabled();
    expect(screen.getByLabelText('branch.hide_statements')).not.toBeDisabled();
  });
  test('toggle fires onToggle with key + next state', () => {
    const onToggle = jest.fn();
    render(<FlagPanel rows={flagRows(state)} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('branch.hide_statements'));
    expect(onToggle).toHaveBeenCalledWith('branch.hide_statements', true);
  });
});

describe('FlagAdmin container', () => {
  beforeEach(() => { jest.clearAllMocks(); getFlagState.mockResolvedValue(state); });
  test('toggling submits a change-request and confirms', async () => {
    render(<FlagAdmin />);
    fireEvent.click(await screen.findByLabelText('branch.hide_statements'));
    await waitFor(() => expect(proposeFlags).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent(/submitted for Owner approval/);
  });
});
