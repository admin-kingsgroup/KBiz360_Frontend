import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// core/api.js reads import.meta.env at module scope (Vite-only syntax) — any
// chain that statically imports it crashes under Jest/CommonJS unless mocked
// before use. mastersLive.jsx pulls it in transitively via core/LedgerLabel and
// core/useAccounting (branchCode), even though this test never calls it.
jest.mock('../../../core/api', () => ({
  isViewOnly: () => false,
  VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.',
  apiGet: jest.fn(() => Promise.resolve([])),
  apiPost: jest.fn(() => Promise.resolve({})),
  apiPut: jest.fn(() => Promise.resolve({})),
  apiDelete: jest.fn(() => Promise.resolve()),
  getAuthToken: () => 'test-token',
}));
// Credit Facilities & Limits is backed by useMasters' generic CRUD hooks — stub
// them so this is a pure component test of the Drawdown Ledgers autocomplete
// (type to filter live supplier ledgers, click to add, chip to remove, Save
// posts the picked array) without a real backend.
jest.mock('../../../core/useMasters', () => ({
  useMasterList: jest.fn(),
  useMasterMutations: jest.fn(),
}));
// eslint-disable-next-line import/first
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
// eslint-disable-next-line import/first
import { CreditFacilitiesMaster } from '../mastersLive';

const LEDGERS = [
  { id: 'l1', name: 'Akbar Travels', group: 'Sundry Creditors', branch: 'BOM' },
  { id: 'l2', name: 'Akbar Online Booking', group: 'Sundry Creditors', branch: 'BOM' },
  { id: 'l3', name: 'NeuIQ Technologies', group: 'Sundry Creditors', branch: 'BOM' },
  // Not a supplier ledger — must never appear in the picker.
  { id: 'l4', name: 'HDFC Bank', group: 'Bank Accounts', branch: 'BOM' },
  // Supplier ledger, but a different branch — out of scope for a BOM facility.
  { id: 'l5', name: 'Some Other Vendor', group: 'Sundry Creditors', branch: 'NBO' },
];

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('Credit Facilities & Limits — Drawdown Ledgers autocomplete', () => {
  let createMutate;

  beforeEach(() => {
    createMutate = jest.fn();
    useMasterMutations.mockReturnValue({
      create: { mutate: createMutate, isPending: false },
      update: { mutate: jest.fn(), isPending: false },
      remove: { mutate: jest.fn(), isPending: false },
    });
    useMasterList.mockImplementation((resource) => {
      if (resource === 'ledgers') return { data: LEDGERS, isLoading: false };
      if (resource === 'credit-facilities') return { data: [], isLoading: false, refetch: jest.fn() };
      return { data: [], isLoading: false };
    });
  });

  test('typing filters to live Sundry Creditors ledgers for the branch; picking one chips it and clears the search', async () => {
    renderWith(<CreditFacilitiesMaster branch="BOM" />);

    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    expect(await screen.findByText('New Credit Facilities & Limit')).toBeInTheDocument();

    const search = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'akbar' } });

    // Both Akbar suppliers on this branch show; the bank ledger and the other
    // branch's supplier ledger never do — not free text, only real BOM suppliers.
    expect(await screen.findByText('Akbar Travels')).toBeInTheDocument();
    expect(screen.getByText('Akbar Online Booking')).toBeInTheDocument();
    expect(screen.queryByText('HDFC Bank')).not.toBeInTheDocument();
    expect(screen.queryByText('Some Other Vendor')).not.toBeInTheDocument();
    expect(screen.queryByText('NeuIQ Technologies')).not.toBeInTheDocument(); // filtered by the typed text too

    fireEvent.click(screen.getByText('Akbar Travels'));

    // Picked → search clears, and a chip renders for the pick.
    expect(search).toHaveValue('');
    expect(screen.getByText('Akbar Travels')).toBeInTheDocument(); // now the chip, not a dropdown option

    // Re-typing the same query no longer offers the already-picked ledger, only
    // the still-unpicked match.
    fireEvent.change(search, { target: { value: 'akbar' } });
    expect(await screen.findByText('Akbar Online Booking')).toBeInTheDocument();
    expect(screen.getAllByText('Akbar Travels')).toHaveLength(1); // just the chip — not re-listed

    // Chip is removable — it drops out of the picked set and, since it's still
    // typed in the search box, reappears as a pickable dropdown match again.
    fireEvent.click(screen.getByRole('button', { name: 'Remove Akbar Travels' }));
    expect(screen.queryByRole('button', { name: 'Remove Akbar Travels' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Akbar Travels' })).toBeInTheDocument();
  });

  test('Save posts the picked ledgers as the drawdownLedgers array (create, since this is a New record)', async () => {
    renderWith(<CreditFacilitiesMaster branch="BOM" />);

    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    await screen.findByText('New Credit Facilities & Limit');

    fireEvent.change(screen.getByPlaceholderText('e.g. Akbar Travels — Trade Credit'), { target: { value: 'Akbar — Trade Credit' } });

    const search = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'akbar' } });
    fireEvent.click(await screen.findByText('Akbar Travels'));
    fireEvent.change(search, { target: { value: 'akbar' } });
    fireEvent.click(await screen.findByText('Akbar Online Booking'));

    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    const [body] = createMutate.mock.calls[0];
    expect(body.drawdownLedgers).toEqual(['Akbar Travels', 'Akbar Online Booking']);
  });
});
