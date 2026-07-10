// React Query hooks for Client (customer) Statement Reconciliation.
//
// The mirror of useSupplierReco on the receivable side. Reads the LIVE client
// debtor-ledger (book side) from the double-entry engine and the imported client
// statement (statement side) from /api/client-reconciliation, then drives
// auto/manual matching. Adds two reads the supplier side doesn't have:
//   • useClientList   — the workbench grid (every debtor + recon status)
//   • useClientAllocation — internal receipts↔invoices FIFO allocation
//
//   GET  /api/client-reconciliation/clients?branch=&from=&to=
//   GET  /api/client-reconciliation/book?client=&branch=&from=&to=
//   GET  /api/client-reconciliation/statement?client=&from=&to=
//   GET  /api/client-reconciliation/allocation?client=&branch=&from=&to=
//   GET  /api/client-reconciliation/summary?client=&from=&to=
//   POST /api/client-reconciliation/import | auto-match | match/:id | unmatch/:id | status/:id
//   DEL  /api/client-reconciliation/statement | line/:id

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, getAuthToken } from './api';
import { branchCode } from './useAccounting';

const enabled = () => !!getAuthToken();

export function useClientList(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['client-reco', 'clients', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/client-reconciliation/clients', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 15_000,
  });
}

export function useClientBook(client, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['client-reco', 'book', client || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/client-reconciliation/book', { client, branch: code, from, to }),
    enabled: enabled() && !!client,
    staleTime: 15_000,
  });
}

export function useClientStatement(client, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['client-reco', 'statement', client || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/client-reconciliation/statement', { client, branch: code, from, to }),
    enabled: enabled() && !!client,
    staleTime: 15_000,
  });
}

export function useClientAllocation(client, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['client-reco', 'allocation', client || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/client-reconciliation/allocation', { client, branch: code, from, to }),
    enabled: enabled() && !!client,
    staleTime: 15_000,
  });
}

export function useClientReconSummary(client, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['client-reco', 'summary', client || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/client-reconciliation/summary', { client, branch: code, from, to }),
    enabled: enabled() && !!client,
    staleTime: 15_000,
  });
}

// Every mutation invalidates the whole 'client-reco' tree so clients + book +
// statement + allocation + summary all re-fetch and stay consistent.
function useReconMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-reco'] }),
  });
}

export const useImportClientStatement = () =>
  useReconMutation((body) => apiPost('/api/client-reconciliation/import', body));

export const useClientAutoMatch = () =>
  useReconMutation((body) => apiPost('/api/client-reconciliation/auto-match', body));

// Batch / scheduled — auto-match every client with open lines in one call.
export const useClientAutoMatchAll = () =>
  useReconMutation((body) => apiPost('/api/client-reconciliation/auto-match-all', body));

export const useClientManualMatch = () =>
  useReconMutation(({ id, ...body }) => apiPost(`/api/client-reconciliation/match/${id}`, body));

// N book legs → one statement line (a split settled by several book entries).
export const useClientGroupMatch = () =>
  useReconMutation(({ id, books }) => apiPost(`/api/client-reconciliation/match-group/${id}`, { books }));

export const useClientUnmatch = () =>
  useReconMutation(({ id }) => apiPost(`/api/client-reconciliation/unmatch/${id}`));

export const useSetClientReconStatus = () =>
  useReconMutation(({ id, status }) => apiPost(`/api/client-reconciliation/status/${id}`, { status }));

export const useClearClientStatement = () =>
  useReconMutation(({ client, branch, from, to }) =>
    apiDelete(`/api/client-reconciliation/statement?${new URLSearchParams({ client, ...(branch ? { branch: branchCode(branch) } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) })}`));

export const useDeleteClientStatementLine = () =>
  useReconMutation(({ id }) => apiDelete(`/api/client-reconciliation/line/${id}`));
