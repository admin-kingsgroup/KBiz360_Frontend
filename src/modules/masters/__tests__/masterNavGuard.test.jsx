import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Phase 3a — every simple master (Ledgers, Parties, Groups, Voucher Types, Cost
// Categories, Credit Facilities, Budgets, Scenarios) edits through ONE shared
// engine (MasterCrud → EditModal). Wiring the unsaved-changes guard there covers
// them all: open an editor, change a field, and leaving the screen must prompt
// before discarding. The guard is only armed while the modal is mounted.

// core/api reads import.meta.env at module scope (Vite-only) — mock before use.
jest.mock('../../../core/api', () => ({
  isViewOnly: () => false,
  VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.',
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
import { MasterCrud } from '../shared/masterCrud';
// eslint-disable-next-line import/first
import { isGuardDirty, clearNavGuard } from '../../../core/ux/navGuard';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const FIELDS = [{ key: 'name', label: 'Name' }];

describe('MasterCrud EditModal — unsaved-changes nav guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearNavGuard();
    useMasterMutations.mockReturnValue({
      create: { mutate: jest.fn(), isPending: false },
      update: { mutate: jest.fn(), isPending: false },
      remove: { mutate: jest.fn(), isPending: false },
    });
    useMasterList.mockReturnValue({ data: [{ id: '1', name: 'Alpha' }], isLoading: false, isError: false, refetch: jest.fn() });
  });
  afterEach(() => clearNavGuard());

  test('the list alone (no editor open) arms nothing', () => {
    renderWith(<MasterCrud title="Widgets" subtitle="test" resource="widgets" fields={FIELDS} />);
    expect(isGuardDirty()).toBe(false);
  });

  test('opening an editor is clean; editing a field arms the guard; closing disarms it', () => {
    renderWith(<MasterCrud title="Widgets" subtitle="test" resource="widgets" fields={FIELDS} />);

    // Open the row editor — form is seeded from the row, so it starts pristine.
    fireEvent.click(screen.getAllByTitle('Edit')[0]);
    expect(isGuardDirty()).toBe(false);

    // Change the field → dirty.
    fireEvent.change(screen.getByDisplayValue('Alpha'), { target: { value: 'Alpha-edited' } });
    expect(isGuardDirty()).toBe(true);

    // Cancel closes the modal (unmount) → the guard clears, no stale dirty-check.
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(isGuardDirty()).toBe(false);
  });

  test('a brand-new record is clean until a field is typed', () => {
    renderWith(<MasterCrud title="Widgets" subtitle="test" resource="widgets" fields={FIELDS} />);
    fireEvent.click(screen.getByRole('button', { name: /^New$/i }));
    expect(isGuardDirty()).toBe(false);
    // The new-record form has one empty "name" input.
    const inp = screen.getAllByRole('textbox').find((el) => el.value === '');
    fireEvent.change(inp, { target: { value: 'Beta' } });
    expect(isGuardDirty()).toBe(true);
  });
});
