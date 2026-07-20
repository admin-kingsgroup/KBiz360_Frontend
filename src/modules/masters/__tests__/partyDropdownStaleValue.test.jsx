import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// core/api.js reads import.meta.env at module scope (Vite-only) — mock before use.
jest.mock('../../../core/api', () => ({
  isViewOnly: () => false,
  VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.',
  apiGet: jest.fn(() => Promise.resolve([])),
  apiPost: jest.fn(() => Promise.resolve({})),
  apiPut: jest.fn(() => Promise.resolve({})),
  apiDelete: jest.fn(() => Promise.resolve()),
  getAuthToken: () => 'test-token',
}));
jest.mock('../../../core/useMasters', () => ({
  useMasterList: jest.fn(),
  useMasterMutations: jest.fn(),
}));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../../core/ux/confirm', () => ({ confirmDialog: jest.fn(() => Promise.resolve({ confirmed: true })) }));
// eslint-disable-next-line import/first
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
// eslint-disable-next-line import/first
import { CustomersMaster } from '../mastersLive';

// A customer whose stored customerType is OFF the current picklist (its type was later
// renamed/deactivated in the Party Type master) — the exact case that used to blank out.
const STALE = { id: 'c9', name: 'Legacy Co', customerType: 'Corporate · Standard', branch: 'BOM', active: true };
const LIVE  = { id: 'c1', name: 'NeuIQ Technologies', customerType: 'B2B', branch: 'BOM', active: true };

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}
const listIs = (rows) => useMasterList.mockImplementation((resource) => (
  resource === 'customers'
    ? { data: rows, isLoading: false, isError: false, refetch: jest.fn() }
    : { data: [], isLoading: false, isError: false }
));

beforeEach(() => {
  jest.clearAllMocks();
  useMasterMutations.mockReturnValue({
    create: { mutate: jest.fn(), isPending: false },
    update: { mutate: jest.fn(), isPending: false },
    remove: { mutate: jest.fn(), isPending: false },
  });
});

describe('Party master dropdown — off-picklist stored value is preserved, not blanked', () => {
  test('editing a customer whose type is no longer in the master keeps it selectable (flagged)', () => {
    listIs([STALE]);
    renderWith(<CustomersMaster branch="BOM" />);
    fireEvent.click(screen.getByTitle('Edit'));            // open the edit modal for the stale row
    // The stale value is offered as its own "(current)" option and IS the selected value —
    // so a straight re-save can't silently drop it. Scope to the modal (the toolbar filter
    // also renders type options).
    const dialog = screen.getByRole('dialog');
    const opt = within(dialog).getByRole('option', { name: /Corporate · Standard \(current\)/ });
    expect(opt).toBeInTheDocument();
    expect(opt.selected).toBe(true);
  });

  test('an in-picklist value does NOT get a duplicate "(current)" option', () => {
    listIs([LIVE]);
    renderWith(<CustomersMaster branch="BOM" />);
    fireEvent.click(screen.getByTitle('Edit'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('option', { name: /B2B \(current\)/ })).toBeNull();
    expect(within(dialog).getByRole('option', { name: 'B2B' }).selected).toBe(true);
  });
});
