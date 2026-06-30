/* Regression: Chart-of-Accounts masters are read LIVE under several query roots.
   A create/edit/delete of a sub-group or ledger must invalidate those extra roots
   (group tree, voucher-picker ledger-registry, books reports) — not just
   ['master', resource] — otherwise the new node doesn't show up until staleTime
   lapses. Guards core/useMasters.js (useMasterMutations + MASTER_RELATED_ROOTS). */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../core/api', () => ({
  apiGet: jest.fn(() => Promise.resolve([])),
  apiPost: jest.fn(() => Promise.resolve({ id: 'x' })),
  apiPut: jest.fn(() => Promise.resolve({ id: 'x' })),
  apiDelete: jest.fn(() => Promise.resolve()),
  getAuthToken: () => 'test-token',
}));

import { useMasterMutations, MASTER_RELATED_ROOTS } from '../core/useMasters';

function setup(resource) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const spy = jest.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useMasterMutations(resource), { wrapper });
  return { result, spy };
}

const invalidatedKeys = (spy) => spy.mock.calls.map((c) => JSON.stringify(c[0].queryKey));

describe('useMasterMutations — cross-root cache invalidation', () => {
  test('ledger create invalidates the chart, ledger-registry pickers, group tree and books', async () => {
    const { result, spy } = setup('ledgers');
    await act(async () => { result.current.create.mutate({ name: 'New Ledger', code: 'X1' }); });
    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    const keys = invalidatedKeys(spy);
    expect(keys).toEqual(expect.arrayContaining([
      JSON.stringify(['master', 'ledgers']),
      JSON.stringify(['ledgers']),
      JSON.stringify(['ref', 'ledger-registry']),
      JSON.stringify(['groups']),
      JSON.stringify(['accounting']),
      JSON.stringify(['finance']),
    ]));
  });

  test('sub-group re-group busts the FULL books roots so the P&L refetches (not just the group tree)', async () => {
    const { result, spy } = setup('subgroups');
    await act(async () => { result.current.update.mutate({ id: 's1', body: { name: 'Renamed' } }); });
    await waitFor(() => expect(result.current.update.isSuccess).toBe(true));
    const keys = invalidatedKeys(spy);
    expect(keys).toEqual(expect.arrayContaining([
      JSON.stringify(['master', 'subgroups']),
      JSON.stringify(['master', 'groups']),
      JSON.stringify(['groups']),
      JSON.stringify(['accounting']),   // BROAD root — matches ['accounting','pnl'|'module-pl'|'pl-tally'…]
      JSON.stringify(['finance']),
    ]));
    // Must NOT use the old narrow key that left the P&L stale after a re-group.
    expect(keys).not.toContain(JSON.stringify(['accounting', 'groups']));
  });

  test('a master with no related roots (voucher-types) only invalidates its own key', async () => {
    const { result, spy } = setup('voucher-types');
    await act(async () => { result.current.remove.mutate('v1'); });
    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));
    const keys = invalidatedKeys(spy);
    expect(keys).toContain(JSON.stringify(['master', 'voucher-types']));
    expect(MASTER_RELATED_ROOTS['voucher-types']).toBeUndefined();
  });
});
