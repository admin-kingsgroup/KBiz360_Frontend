import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// core/api.js reads import.meta.env at module scope (Vite-only) — mock before use.
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
import { SuppliersMaster } from '../mastersLive';

// Vendors are per-branch (shared/constants/ledgerScope): BOM owns these, AMD owns none.
const BOM_ROW = { id: 'sup-1', name: 'Akbar Travels of India (P) Ltd', category: 'Airline', branch: 'BOM', active: true };
const BOM_ROW_2 = { id: 'sup-2', name: 'Wasim Khan', category: 'Misc', branch: 'BOM', active: true };

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const listIs = (rows) => useMasterList.mockImplementation((resource) => (
  resource === 'suppliers'
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

describe('Suppliers master — empty state must explain WHY it is empty', () => {
  test('a branch that owns no vendors: names the branch, the per-branch rule, and where the others are — never the bare "No records yet"', () => {
    listIs([BOM_ROW, BOM_ROW_2]);          // both BOM; AMD owns none
    renderWith(<SuppliersMaster branch="AMD" />);

    // WHAT: this branch has none. WHY: vendors are per-branch, the others belong elsewhere.
    // WHERE: add here, or switch branch from the top-right selector.
    expect(screen.getByText(/No vendors onboarded for AMD yet/i)).toBeInTheDocument();
    expect(screen.getByText(/per-branch/i)).toBeInTheDocument();
    expect(screen.getByText(/2 vendor\(s\) on file belong to other branches/i)).toBeInTheDocument();
    expect(screen.getByText(/top-right selector/i)).toBeInTheDocument();
    // The misleading generic line must be gone — the records DO exist, just not here.
    expect(screen.queryByText(/No records yet/i)).toBeNull();
  });

  test('genuinely empty master (nothing on file anywhere): plain add-one prompt, no false claim about other branches', () => {
    listIs([]);
    renderWith(<SuppliersMaster branch="AMD" />);

    expect(screen.getByText(/No vendors yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/belong to other branches/i)).toBeNull();
  });

  test('the owning branch still lists its own vendors (the filter itself is correct and unchanged)', () => {
    listIs([BOM_ROW, BOM_ROW_2]);
    renderWith(<SuppliersMaster branch="BOM" />);

    expect(screen.getByText('Akbar Travels of India (P) Ltd')).toBeInTheDocument();
    expect(screen.queryByText(/No vendors onboarded/i)).toBeNull();
  });
});
