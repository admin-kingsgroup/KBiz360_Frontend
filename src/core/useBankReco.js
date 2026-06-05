// React Query hooks for the Bank Reconciliation module.
//
// Reads the LIVE bank ledger (book side) from the double-entry engine and the
// imported bank statement (bank side) from the new /api/bank-reconciliation
// endpoints, then drives auto/manual matching. No demo-data fallback — empty in,
// empty out (same contract as useAccounting / useVouchers).
//
//   GET  /api/bank-reconciliation/ledgers
//   GET  /api/bank-reconciliation/book?ledger=&branch=&from=&to=
//   GET  /api/bank-reconciliation/statement?ledger=&from=&to=
//   GET  /api/bank-reconciliation/summary?ledger=&from=&to=
//   POST /api/bank-reconciliation/import | auto-match | match/:id | unmatch/:id | status/:id
//   DEL  /api/bank-reconciliation/statement | line/:id

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, getAuthToken } from './api';
import { branchCode } from './useAccounting';

const enabled = () => !!getAuthToken();

export function useBankLedgers(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['bank-reco', 'ledgers', code || 'all'],
    queryFn: () => apiGet('/api/bank-reconciliation/ledgers', { branch: code }),
    enabled: enabled(),
    staleTime: 60_000,
  });
}

export function useBankBook(ledger, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['bank-reco', 'book', ledger || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/bank-reconciliation/book', { ledger, branch: code, from, to }),
    enabled: enabled() && !!ledger,
    staleTime: 15_000,
  });
}

export function useBankStatement(ledger, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['bank-reco', 'statement', ledger || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/bank-reconciliation/statement', { ledger, from, to }),
    enabled: enabled() && !!ledger,
    staleTime: 15_000,
  });
}

export function useBankReconSummary(ledger, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['bank-reco', 'summary', ledger || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/bank-reconciliation/summary', { ledger, from, to }),
    enabled: enabled() && !!ledger,
    staleTime: 15_000,
  });
}

// Every mutation invalidates the whole 'bank-reco' tree so book + statement +
// summary all re-fetch and stay consistent after any reconciliation action.
function useReconMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-reco'] }),
  });
}

export const useImportStatement = () =>
  useReconMutation((body) => apiPost('/api/bank-reconciliation/import', body));

export const useAutoMatch = () =>
  useReconMutation((body) => apiPost('/api/bank-reconciliation/auto-match', body));

export const useManualMatch = () =>
  useReconMutation(({ id, ...body }) => apiPost(`/api/bank-reconciliation/match/${id}`, body));

export const useUnmatch = () =>
  useReconMutation(({ id }) => apiPost(`/api/bank-reconciliation/unmatch/${id}`));

export const useSetReconStatus = () =>
  useReconMutation(({ id, status }) => apiPost(`/api/bank-reconciliation/status/${id}`, { status }));

export const useClearStatement = () =>
  useReconMutation(({ ledger, from, to }) =>
    apiDelete(`/api/bank-reconciliation/statement?${new URLSearchParams({ ledger, ...(from ? { from } : {}), ...(to ? { to } : {}) })}`));

export const useDeleteStatementLine = () =>
  useReconMutation(({ id }) => apiDelete(`/api/bank-reconciliation/line/${id}`));
