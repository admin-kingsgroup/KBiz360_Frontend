// useCanOriginate — the FE mirror of entryRights.assertMayOriginate.
// Without it the SO/PO/GP · INB · Refund screens have NO role gate at all: a Branch
// Accountant under control keys an entire booking, presses an enabled Save, and only then
// gets a 403 with their work stranded on screen. These tests pin that it blocks the right
// person, on the right branch, and nobody else — and stays dormant by default.
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../core/api', () => ({ apiGet: jest.fn(), getAuthToken: () => 'tok' }));
jest.mock('../../../core/approvalChain', () => ({
  chainUser: jest.fn(),
  // the real branch-wise resolver — mirrors backend isEnabled
  flagOn: (flags, key, branch) => {
    const f = (flags || {})[key];
    if (!f) return false;
    if (f.foundation === true) return true;
    if (branch && f.branches && Object.prototype.hasOwnProperty.call(f.branches, branch)) return f.branches[branch] === true;
    return f.enabled === true;
  },
}));

// eslint-disable-next-line import/first
import { apiGet } from '../../../core/api';
// eslint-disable-next-line import/first
import { chainUser } from '../../../core/approvalChain';
// eslint-disable-next-line import/first
import { useCanOriginate } from '../useCanOriginate';

const FLAG = 'control.role.branch_accountant';
const wrap = ({ children }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};
const asRole = (role) => chainUser.mockReturnValue({ email: 'x@y.com', role });
const serve = (flags) => apiGet.mockResolvedValue({ flags });

beforeEach(() => {
  jest.clearAllMocks();
  serve({});
});

test('DORMANT by default: a Branch Accountant may raise anything while the flag is off', async () => {
  asRole('Branch Accountant');
  const { result } = renderHook(() => useCanOriginate('BOM', 'booking'), { wrapper: wrap });
  await waitFor(() => expect(apiGet).toHaveBeenCalled());
  expect(result.current.blocked).toBe(false);
  expect(result.current.reason).toBe('');
});

test('engaged: a Branch Accountant is blocked, and the reason says where the document comes from', async () => {
  asRole('Branch Accountant');
  serve({ [FLAG]: { enabled: true } });
  const { result } = renderHook(() => useCanOriginate('BOM', 'booking'), { wrapper: wrap });
  await waitFor(() => expect(result.current.blocked).toBe(true));
  expect(result.current.reason).toMatch(/come from the CRM/);
  expect(result.current.reason).toMatch(/Check it to hand it to the verifier/);
  expect(result.current.reason).toMatch(/an SO\/PO\/GP booking/);
});

test('the reason names the actual document kind', async () => {
  asRole('Branch Accountant');
  serve({ [FLAG]: { enabled: true } });
  const inb = renderHook(() => useCanOriginate('BOM', 'inb'), { wrapper: wrap });
  await waitFor(() => expect(inb.result.current.blocked).toBe(true));
  expect(inb.result.current.reason).toMatch(/an inter-branch deal/);

  const rev = renderHook(() => useCanOriginate('BOM', 'reversal'), { wrapper: wrap });
  await waitFor(() => expect(rev.result.current.blocked).toBe(true));
  expect(rev.result.current.reason).toMatch(/a refund or reissue/);
});

test('branch-wise: engaged for BOM only → NBO is untouched', async () => {
  asRole('Branch Accountant');
  serve({ [FLAG]: { enabled: false, branches: { BOM: true } } });
  const bom = renderHook(() => useCanOriginate('BOM', 'booking'), { wrapper: wrap });
  await waitFor(() => expect(bom.result.current.blocked).toBe(true));
  const nbo = renderHook(() => useCanOriginate('NBO', 'booking'), { wrapper: wrap });
  await waitFor(() => expect(apiGet).toHaveBeenCalled());
  expect(nbo.result.current.blocked).toBe(false);
});

test('nobody else is ever blocked — and they do not even pay for the fetch', async () => {
  serve({ [FLAG]: { enabled: true } });
  for (const role of ['Sr. Accounts Executive', 'Senior Finance Manager', 'Director', 'Owner', 'Super Admin', 'Branch Manager']) {
    jest.clearAllMocks();
    serve({ [FLAG]: { enabled: true } });
    asRole(role);
    const { result } = renderHook(() => useCanOriginate('BOM', 'booking'), { wrapper: wrap });
    expect(result.current.blocked).toBe(false);
    expect(apiGet).not.toHaveBeenCalled();   // query disabled for non-accountants
  }
});

// 'Sr. Accounts Executive' contains "Accounts" — a loose /accountant/i style test would
// wrongly match her and block Sughra from raising a booking.
test('the role test is exact — an Accounts Executive is not a Branch Accountant', async () => {
  serve({ [FLAG]: { enabled: true } });
  asRole('Sr. Accounts Executive');
  const { result } = renderHook(() => useCanOriginate('BOM', 'booking'), { wrapper: wrap });
  expect(result.current.blocked).toBe(false);
});

test('a failed flag read fails OPEN — a control-plane hiccup never stops a branch working', async () => {
  asRole('Branch Accountant');
  apiGet.mockRejectedValue(new Error('403'));
  const { result } = renderHook(() => useCanOriginate('BOM', 'booking'), { wrapper: wrap });
  await waitFor(() => expect(apiGet).toHaveBeenCalled());
  expect(result.current.blocked).toBe(false);
});

test('it reads /effective, not the central-only /api/tk/flags (which would 403 for this role)', async () => {
  asRole('Branch Accountant');
  renderHook(() => useCanOriginate('BOM', 'booking'), { wrapper: wrap });
  await waitFor(() => expect(apiGet).toHaveBeenCalled());
  expect(apiGet).toHaveBeenCalledWith('/api/tk/flags/effective');
});
