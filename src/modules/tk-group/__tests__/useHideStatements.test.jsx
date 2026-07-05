import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api/myRole', () => ({ getMyRole: jest.fn() }));
// eslint-disable-next-line import/first
import { getMyRole } from '../api/myRole';
// eslint-disable-next-line import/first
import { useHideStatements } from '../useHideStatements';

// Tiny probe component that renders the hook's boolean.
function Probe({ user }) {
  const hide = useHideStatements(user);
  return <span data-testid="hide">{String(hide)}</span>;
}
function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('useHideStatements', () => {
  beforeEach(() => jest.clearAllMocks());

  test('accountant WITH the control active → true', async () => {
    getMyRole.mockResolvedValue({ role: 'Branch Accountant', activeControls: ['branch.hide_statements'] });
    renderWith(<Probe user={{ role: 'Branch Accountant' }} />);
    await waitFor(() => expect(screen.getByTestId('hide')).toHaveTextContent('true'));
  });

  test('accountant WITHOUT the control (dormant) → false', async () => {
    getMyRole.mockResolvedValue({ role: 'Branch Accountant', activeControls: [] });
    renderWith(<Probe user={{ role: 'Branch Accountant' }} />);
    await waitFor(() => expect(getMyRole).toHaveBeenCalled());
    expect(screen.getByTestId('hide')).toHaveTextContent('false');
  });

  test('a non-accountant → false and never queries', () => {
    renderWith(<Probe user={{ role: 'Super Admin' }} />);
    expect(screen.getByTestId('hide')).toHaveTextContent('false');
    expect(getMyRole).not.toHaveBeenCalled();
  });
});
