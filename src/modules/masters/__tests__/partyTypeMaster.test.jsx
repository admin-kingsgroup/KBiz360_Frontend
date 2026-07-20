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
// eslint-disable-next-line import/first
import { PartyTypeMaster } from '../utilities/partyTypeMaster';

const B2B  = { id: 'p1', kind: 'customer', name: 'B2B', active: true, sortOrder: 30 };
const INB  = { id: 'p2', kind: 'customer', name: 'Inter Branch', active: true, sortOrder: 50 };
const AIR  = { id: 'p3', kind: 'supplier', name: 'Airline', active: true, sortOrder: 10 };

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}
const listIs = (rows) => useMasterList.mockImplementation((resource) => (
  resource === 'party-types'
    ? { data: rows, isLoading: false, isError: false, refetch: jest.fn() }
    : { data: [], isLoading: false, isError: false }
));
// The Kind filter is the only <select> the page renders (Pager has none).
const kindPicker = () => screen.getByRole('combobox');

beforeEach(() => {
  jest.clearAllMocks();
  useMasterMutations.mockReturnValue({
    create: { mutate: jest.fn(), isPending: false },
    update: { mutate: jest.fn(), isPending: false },
    remove: { mutate: jest.fn(), isPending: false },
  });
});

describe('Party Type Master — Client Types + Supplier Categories', () => {
  test('lists both kinds by default (All party types)', () => {
    listIs([B2B, INB, AIR]);
    renderWith(<PartyTypeMaster />);
    expect(screen.getByText('B2B')).toBeInTheDocument();
    expect(screen.getByText('Inter Branch')).toBeInTheDocument();
    expect(screen.getByText('Airline')).toBeInTheDocument();
  });

  test('the Kind filter narrows to one vocabulary', () => {
    listIs([B2B, INB, AIR]);
    renderWith(<PartyTypeMaster />);
    fireEvent.change(kindPicker(), { target: { value: 'supplier' } });
    expect(screen.getByText('Airline')).toBeInTheDocument();
    expect(screen.queryByText('B2B')).toBeNull();
    expect(screen.queryByText('Inter Branch')).toBeNull();
  });
});
