// Regression: a voucher mutation (create / edit / approve / reject / delete /
// settle) must invalidate EVERY server-state root that reflects the books —
// including the migrated 'finance' feature (Trial Balance + Receipt/Payment/
// Contra/Journal registers, keyed ['finance', …]). Before the fix, the mutations
// only invalidated ['vouchers']/['accounting']/['groups'], so a deleted voucher
// kept showing in the finance registers & Trial Balance — the "deleted voucher
// still in the ledger, not refreshing" bug.
//
// api.js uses import.meta.env (no babel plugin under Jest), so mock it. The
// confirm dialog is mocked to auto-approve so the edit path needs no UI.
jest.mock('../api', () => ({
  apiGet: jest.fn(() => Promise.resolve({})),
  apiPut: jest.fn(() => Promise.resolve({})),
  apiPost: jest.fn(() => Promise.resolve({})),
  apiDelete: jest.fn(() => Promise.resolve({})),
  getAuthToken: jest.fn(() => 'open'),
}));
jest.mock('../ux/confirm', () => ({
  confirmDialog: jest.fn(() => Promise.resolve({ confirmed: true, reason: 'test' })),
}));

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useDeleteVoucher, useCreateVoucher, useUpdateVoucher,
  useApproveVoucher, useRejectVoucher, useRevokeVoucher, useApproveMany, useApproveAll, useSettleAdvance,
} from '../useAccounting';
import { apiPost } from '../api';

// Roots that reflect the books and MUST refresh after any voucher change.
const BOOK_ROOTS = ['vouchers', 'accounting', 'groups', 'finance'];

function makeHarness() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const spy = jest.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, spy, wrapper };
}

// The set of first-segment query keys passed to invalidateQueries during the call.
const invalidatedRoots = (spy) =>
  new Set(spy.mock.calls.map((c) => (c[0] && Array.isArray(c[0].queryKey) ? c[0].queryKey[0] : undefined)));

describe('voucher mutations invalidate every books cache (incl. finance)', () => {
  const cases = [
    ['useDeleteVoucher', useDeleteVoucher, { id: 'v1', by: 'admin', reason: 'x' }],
    ['useCreateVoucher', useCreateVoucher, { branch: 'BOM', category: 'receipt', total: 1 }],
    ['useUpdateVoucher', useUpdateVoucher, { id: 'v1', body: { editReason: 'fix', branch: 'BOM' } }],
    ['useApproveVoucher', useApproveVoucher, { id: 'v1', approver: 'admin' }],
    ['useRejectVoucher', useRejectVoucher, { id: 'v1', by: 'admin', reason: 'x' }],
    ['useRevokeVoucher', useRevokeVoucher, { id: 'v1', reason: 'wrong ledger' }],
    ['useApproveMany', useApproveMany, { ids: ['v1', 'v2'], approver: 'admin' }],
    ['useApproveAll', useApproveAll, { branch: 'BOM', approver: 'admin' }],
    ['useSettleAdvance', useSettleAdvance, { id: 'v1', allocations: [] }],
  ];

  test.each(cases)('%s invalidates finance + accounting + vouchers + groups', async (_name, hook, vars) => {
    const { spy, wrapper } = makeHarness();
    const { result } = renderHook(() => hook(), { wrapper });
    result.current.mutate(vars);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const roots = invalidatedRoots(spy);
    for (const root of BOOK_ROOTS) {
      expect(roots).toContain(root); // <-- 'finance' is the one the bug was missing
    }
  });

  test('useRevokeVoucher posts to /revoke with the reason (un-approve endpoint)', async () => {
    const { wrapper } = makeHarness();
    apiPost.mockClear();
    const { result } = renderHook(() => useRevokeVoucher(), { wrapper });
    result.current.mutate({ id: 'v9', reason: 'wrong ledger' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiPost).toHaveBeenCalledWith('/api/vouchers/v9/revoke', { reason: 'wrong ledger' });
  });
});
