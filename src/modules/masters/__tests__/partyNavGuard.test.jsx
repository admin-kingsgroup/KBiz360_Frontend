// Phase 3 (bespoke masters) — the Customer & Supplier tabbed masters (12 tabs each)
// both run through ONE shared engine, usePartyMaster, which already tracks a live
// `dirty` (snapshot-vs-baseline, reset on save). Wiring the unsaved-changes guard to
// that signal covers both masters: editing a party and leaving must confirm before
// discarding. This drives the hook directly to prove the wire.

// core/api reads import.meta.env at module scope (Vite-only) — mock before use.
jest.mock('../../../core/api', () => ({
  isViewOnly: () => false,
  VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.',
  apiGet: jest.fn(() => Promise.resolve([])),
  apiPost: jest.fn(() => Promise.resolve({})),
  apiPut: jest.fn(() => Promise.resolve({})),
  apiDelete: jest.fn(() => Promise.resolve()),
  getAuthToken: () => 'test-token',
}));
jest.mock('../../../core/useMasters', () => ({ useMasterList: jest.fn(), useMasterMutations: jest.fn() }));
jest.mock('../../../core/LedgerModalHost', () => ({ openLedgerModal: jest.fn() }));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// eslint-disable-next-line import/first
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
// eslint-disable-next-line import/first
import { usePartyMaster } from '../shared/partyMaster';
// eslint-disable-next-line import/first
import { isGuardDirty, clearNavGuard } from '../../../core/ux/navGuard';

function Harness() {
  const m = usePartyMaster('customers', 'customer', 'BOM');
  return (
    <input aria-label="name" value={m.form?.name || ''} onChange={(e) => m.setField('name', e.target.value)} />
  );
}
function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('usePartyMaster — unsaved-changes nav guard (Customer + Supplier masters)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearNavGuard();
    useMasterMutations.mockReturnValue({
      update: { mutate: jest.fn(), isPending: false },
      create: { mutate: jest.fn(), isPending: false },
    });
    useMasterList.mockReturnValue({ data: [{ id: '1', name: 'Alpha', branch: 'BOM' }], isLoading: false, refetch: jest.fn() });
  });
  afterEach(() => clearNavGuard());

  test('a freshly loaded party is not dirty; editing a field arms the guard; reverting disarms it', () => {
    renderWith(<Harness />);
    expect(isGuardDirty()).toBe(false);
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Alpha & Co' } });
    expect(isGuardDirty()).toBe(true);
    // Snapshot compare (not a one-way flag): editing back to the baseline clears it.
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Alpha' } });
    expect(isGuardDirty()).toBe(false);
  });

  test('unmounting the master clears the guard (no stale dirty-check after navigation)', () => {
    const { unmount } = renderWith(<Harness />);
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Edited' } });
    expect(isGuardDirty()).toBe(true);
    unmount();
    expect(isGuardDirty()).toBe(false);
  });
});
