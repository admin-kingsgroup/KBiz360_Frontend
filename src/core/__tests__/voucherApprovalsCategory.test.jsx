// Per-type approval screens: useVoucherApprovals(branch, status, { category }) must
// pass the category through to GET /api/vouchers/approvals AND fold it into the query
// key (so each type's cache stays separate and never bleeds into another tab). And
// useApproveAll must carry the category into the approve-all querystring so "Approve
// all" on a single-type screen only posts that type. api.js reads import.meta.env
// (no babel plugin under Jest) → mock it.
jest.mock('../api', () => ({
  apiGet: jest.fn(() => Promise.resolve({ counts: {}, entries: [] })),
  apiPost: jest.fn(() => Promise.resolve({ approved: 0, failed: 0, total: 0 })),
  getAuthToken: jest.fn(() => 'open'),
}));

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useVoucherApprovals, useApproveAll } from '../useAccounting';
import { apiGet, apiPost } from '../api';

function wrapperFor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useVoucherApprovals category scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  test('passes category to the approvals endpoint when set', async () => {
    const { result } = renderHook(() => useVoucherApprovals('BOM', 'pending', { category: 'receipt' }), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [url, params] = apiGet.mock.calls[0];
    expect(url).toBe('/api/vouchers/approvals');
    expect(params.category).toBe('receipt');
  });

  test('omits category from the request when not set (combined queue)', async () => {
    const { result } = renderHook(() => useVoucherApprovals('BOM', 'pending'), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [, params] = apiGet.mock.calls[0];
    expect('category' in params).toBe(false);
  });

  test('two categories produce distinct caches — the second refetches (own query key)', async () => {
    const wrapper = wrapperFor(); // shared client across both hooks
    const a = renderHook(() => useVoucherApprovals('BOM', 'pending', { category: 'receipt' }), { wrapper });
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    const b = renderHook(() => useVoucherApprovals('BOM', 'pending', { category: 'payment' }), { wrapper });
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));
    // Distinct keys → a real second fetch (not served from the receipt cache).
    const cats = apiGet.mock.calls.map((c) => c[1].category);
    expect(cats).toEqual(expect.arrayContaining(['receipt', 'payment']));
  });
});

describe('useApproveAll category scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  test('carries the category into the approve-all querystring', async () => {
    const { result } = renderHook(() => useApproveAll(), { wrapper: wrapperFor() });
    result.current.mutate({ branch: 'BOM', category: 'debit-note', approver: 'admin' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = apiPost.mock.calls[0][0];
    expect(url).toContain('category=debit-note');
    expect(url).toContain('branch=BOM');
  });

  test('no category → approve-all querystring omits it (whole queue)', async () => {
    const { result } = renderHook(() => useApproveAll(), { wrapper: wrapperFor() });
    result.current.mutate({ branch: 'BOM', approver: 'admin' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiPost.mock.calls[0][0]).not.toContain('category=');
  });
});
