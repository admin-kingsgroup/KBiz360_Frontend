import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// core/api.js reads import.meta.env at module scope (Vite-only syntax) — any
// chain that statically imports it crashes under Jest/CommonJS unless mocked
// before use (mastersLive.jsx pulls it in transitively).
jest.mock('../../../core/api', () => ({
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
import { toast } from '../../../core/ux/toast';
// eslint-disable-next-line import/first
import { confirmDialog } from '../../../core/ux/confirm';
// eslint-disable-next-line import/first
import { SuppliersMaster } from '../mastersLive';

// A "derived" row is a ledger the backend surfaces for visibility (a party that
// only exists because a voucher referenced it) — no real Supplier document
// behind it, so it has no delete-able master record and blank Category/Phone/etc.
const DERIVED_ROW = { id: 'derived:Akbar Travels of India (P) Ltd - B2B', name: 'Akbar Travels of India (P) Ltd - B2B', branch: 'BOM', active: true };
const REAL_ROW = { id: 'sup-1', name: 'TRIP JACK Private Limited [Holidays/Hotels]', category: 'Airline', branch: 'BOM', active: true, creditDays: 15, creditLimit: 500000 };
const INACTIVE_ROW = { id: 'sup-2', name: 'Wasim Khan', category: 'Misc', branch: 'BOM', active: false };

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('Suppliers master — Delete/Deactivate row actions', () => {
  let createMutate, updateMutate, removeMutate;

  beforeEach(() => {
    jest.clearAllMocks();
    createMutate = jest.fn();
    updateMutate = jest.fn();
    removeMutate = jest.fn();
    useMasterMutations.mockReturnValue({
      create: { mutate: createMutate, isPending: false },
      update: { mutate: updateMutate, isPending: false },
      remove: { mutate: removeMutate, isPending: false },
    });
    useMasterList.mockImplementation((resource) => {
      if (resource === 'suppliers') return { data: [DERIVED_ROW, REAL_ROW, INACTIVE_ROW], isLoading: false, refetch: jest.fn() };
      return { data: [], isLoading: false };
    });
  });

  // Selectors match the REAL button titles: the Deactivate tooltip is
  // "Deactivate — keeps the record and its history; use instead of Delete"
  // (so a bare /Delete/ regex would also match it), a derived row's Delete
  // carries the "no master record" explanation, and an INACTIVE row swaps
  // Deactivate for an enabled "Reactivate" — there is no disabled
  // "Already inactive" state in the UI.
  const DEACTIVATE_RE = /^Deactivate — keeps the record/;

  test('derived row: Delete is disabled (no confirm, no API call); Deactivate promotes it to a real record with active:false', async () => {
    renderWith(<SuppliersMaster branch="BOM" />);

    const derivedDelete = screen.getByTitle(/no master record/);
    expect(derivedDelete).toBeDisabled();
    fireEvent.click(derivedDelete);
    expect(confirmDialog).not.toHaveBeenCalled();
    expect(removeMutate).not.toHaveBeenCalled();

    const deactivateButtons = screen.getAllByTitle(DEACTIVATE_RE);
    fireEvent.click(deactivateButtons[0]); // DERIVED_ROW is first
    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    const [body] = createMutate.mock.calls[0];
    expect(body.active).toBe(false);
    expect(body.name).toBe('Akbar Travels of India (P) Ltd - B2B');
    expect(body.id).toBeUndefined();
    expect(updateMutate).not.toHaveBeenCalled();
  });

  test('a real, active row: Delete works as before; Deactivate updates active:false on its real id', async () => {
    renderWith(<SuppliersMaster branch="BOM" />);

    const deleteButtons = screen.getAllByTitle('Delete'); // exact — real rows only
    expect(deleteButtons[0]).not.toBeDisabled(); // REAL_ROW's Delete is enabled
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => expect(confirmDialog).toHaveBeenCalled());
    await waitFor(() => expect(removeMutate).toHaveBeenCalledWith('sup-1', expect.anything()));

    // DERIVED_ROW (still active) also gets a "Deactivate" button — REAL_ROW's is second.
    const deactivateButtons = screen.getAllByTitle(DEACTIVATE_RE);
    fireEvent.click(deactivateButtons[1]);
    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    const [{ id, body }] = updateMutate.mock.calls[0];
    expect(id).toBe('sup-1');
    expect(body.active).toBe(false);
    expect(createMutate).not.toHaveBeenCalled();
  });

  test('an already-inactive row: shows an enabled Reactivate that flips active:true (no confirm)', async () => {
    renderWith(<SuppliersMaster branch="BOM" />);

    const reactivate = screen.getByTitle('Reactivate'); // only INACTIVE_ROW carries it
    expect(reactivate).not.toBeDisabled();
    fireEvent.click(reactivate);
    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(confirmDialog).not.toHaveBeenCalled(); // reactivation needs no confirm
    const [{ id, body }] = updateMutate.mock.calls[0];
    expect(id).toBe('sup-2');
    expect(body.active).toBe(true);
    expect(createMutate).not.toHaveBeenCalled();
  });
});
