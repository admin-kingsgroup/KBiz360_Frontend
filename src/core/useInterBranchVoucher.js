// React Query hooks for the Inter-Branch (INB) voucher + link registry.
//   POST /api/inter-branch                 raise an inter-branch sale
//   GET  /api/inter-branch/open?toBranch=   open INB legs to fetch into a PO
//   GET  /api/inter-branch/reconcile?branch= matched / unbooked by INB Link No
//   POST /api/inter-branch/:inbLinkNo/book   { purchaseVno }
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, getAuthToken } from './api';

const enabled = () => (typeof getAuthToken === 'function' ? !!getAuthToken() : false);
// Resolve a branch code without importing from useAccounting (keeps this hook
// independent of that module's mock in component tests). 'ALL'/blank → undefined.
const branchCode = (b) => (!b || b === 'ALL' ? undefined : (b.code || b));

// Open INB legs addressed to a branch (the buyer's PO picker + worklist).
export function useOpenInb(toBranch) {
  const code = branchCode(toBranch);
  return useQuery({
    queryKey: ['inb', 'open', code || 'all'],
    queryFn: () => apiGet('/api/inter-branch/open', { toBranch: code }),
    enabled: enabled(),
    staleTime: 15_000,
  });
}

export function useInbReconcile(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['inb', 'reconcile', code || 'all'],
    queryFn: () => apiGet('/api/inter-branch/reconcile', { branch: code }),
    enabled: enabled(),
    staleTime: 15_000,
  });
}

// Inter-branch P&L breakdown: counterparty branch → module → component.
export function useInbPnlBreakdown(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['inb', 'pnl', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/inter-branch/pnl-breakdown', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 15_000,
  });
}

// Seller→buyer trade matrix + per-pair margin (SVF income vs discount given).
export function useInbMatrix({ from, to } = {}) {
  return useQuery({
    queryKey: ['inb', 'matrix', from || '', to || ''],
    queryFn: () => apiGet('/api/inter-branch/matrix', { from, to }),
    enabled: enabled(),
    staleTime: 15_000,
  });
}

// Per-counterparty date-ordered statement of inter-branch deals (the registry ledger).
export function useInbCounterparty(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['inb', 'counterparty', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/inter-branch/counterparty', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 15_000,
  });
}

function useInbMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => qc.invalidateQueries({ queryKey: ['inb'] }) });
}

export const useCreateInb = () => useInbMutation((body) => apiPost('/api/inter-branch', body));
export const useBookInb   = () => useInbMutation(({ id, ...body }) => apiPost(`/api/inter-branch/${id}/book`, body));
export const useReopenInb = () => useInbMutation(({ id }) => apiPost(`/api/inter-branch/${id}/reopen`));
