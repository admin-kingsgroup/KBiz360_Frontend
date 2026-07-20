import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
// Imported through mastersLive to also prove the strangler-fig re-export wiring.
// eslint-disable-next-line import/first
import { CustomersMaster } from '../mastersLive';

const B2B = { id: 'c1', name: 'NeuIQ Technologies', customerType: 'B2B', branch: 'BOM', active: true };
const B2C = { id: 'c2', name: 'B2C Ref Farhan', customerType: 'B2C Reference', branch: 'BOM', active: true };
const UNCLASSIFIED = { id: 'c3', name: 'Global Konnection', customerType: '', branch: 'BOM', active: true }; // historic row, no type

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const listIs = (rows) => useMasterList.mockImplementation((resource) => (
  resource === 'customers'
    ? { data: rows, isLoading: false, isError: false, refetch: jest.fn() }
    : { data: [], isLoading: false, isError: false }
));

// The Type filter is the only <select> the Customers page renders (Pager has none).
const typePicker = () => screen.getByRole('combobox');

beforeEach(() => {
  jest.clearAllMocks();
  useMasterMutations.mockReturnValue({
    create: { mutate: jest.fn(), isPending: false },
    update: { mutate: jest.fn(), isPending: false },
    remove: { mutate: jest.fn(), isPending: false },
  });
});

describe('Customers master — Client Type filter', () => {
  test('defaults to All types — every customer shows, whatever its type', () => {
    listIs([B2B, B2C, UNCLASSIFIED]);
    renderWith(<CustomersMaster branch="BOM" />);

    expect(screen.getByText('NeuIQ Technologies')).toBeInTheDocument();
    expect(screen.getByText('B2C Ref Farhan')).toBeInTheDocument();
    expect(screen.getByText('Global Konnection')).toBeInTheDocument();
    // The type is now a visible column, not just a hidden form field. Assert the
    // column HEADER (unique) — the value 'B2C Reference' also appears as a dropdown
    // <option>, so matching the value alone is ambiguous.
    expect(screen.getByRole('columnheader', { name: /Customer Type/i })).toBeInTheDocument();
  });

  test('picking a type narrows the list to that type only', () => {
    listIs([B2B, B2C, UNCLASSIFIED]);
    renderWith(<CustomersMaster branch="BOM" />);

    fireEvent.change(typePicker(), { target: { value: 'B2B' } });

    expect(screen.getByText('NeuIQ Technologies')).toBeInTheDocument();
    expect(screen.queryByText('B2C Ref Farhan')).toBeNull();
    expect(screen.queryByText('Global Konnection')).toBeNull();
  });

  test('Unclassified isolates the historic rows carrying no type — they are not silently swallowed', () => {
    listIs([B2B, B2C, UNCLASSIFIED]);
    renderWith(<CustomersMaster branch="BOM" />);

    fireEvent.change(typePicker(), { target: { value: '__blank__' } });

    expect(screen.getByText('Global Konnection')).toBeInTheDocument();
    expect(screen.queryByText('NeuIQ Technologies')).toBeNull();
    expect(screen.queryByText('B2C Ref Farhan')).toBeNull();
  });

  test('a filter that hides every row says WHY it is empty — not a bare "no customers"', () => {
    listIs([B2B, B2C, UNCLASSIFIED]);
    renderWith(<CustomersMaster branch="BOM" />);

    fireEvent.change(typePicker(), { target: { value: 'B2E' } }); // nobody is B2E here

    expect(screen.getByText(/3 of 3 hidden/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose .All types./i)).toBeInTheDocument();
    expect(screen.queryByText(/No customers yet/i)).toBeNull();
  });
});
