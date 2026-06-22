// React Query hooks for Supplier (vendor) Statement Reconciliation.
//
// Reads the LIVE supplier creditor-ledger (book side) from the double-entry
// engine and the imported vendor statement (statement side) from the new
// /api/supplier-reconciliation endpoints, then drives auto/manual matching.
// Same contract as useBankReco — empty in, empty out, no demo fallback.
//
//   GET  /api/supplier-reconciliation/book?supplier=&branch=&from=&to=
//   GET  /api/supplier-reconciliation/statement?supplier=&from=&to=
//   GET  /api/supplier-reconciliation/summary?supplier=&from=&to=
//   POST /api/supplier-reconciliation/import | auto-match | match/:id | unmatch/:id | status/:id
//   DEL  /api/supplier-reconciliation/statement | line/:id

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, getAuthToken } from './api';
import { branchCode } from './useAccounting';

const enabled = () => !!getAuthToken();

export function useSupplierBook(supplier, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['supplier-reco', 'book', supplier || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/supplier-reconciliation/book', { supplier, branch: code, from, to }),
    enabled: enabled() && !!supplier,
    staleTime: 15_000,
  });
}

export function useSupplierStatement(supplier, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['supplier-reco', 'statement', supplier || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/supplier-reconciliation/statement', { supplier, branch: code, from, to }),
    enabled: enabled() && !!supplier,
    staleTime: 15_000,
  });
}

export function useSupplierReconSummary(supplier, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['supplier-reco', 'summary', supplier || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/supplier-reconciliation/summary', { supplier, branch: code, from, to }),
    enabled: enabled() && !!supplier,
    staleTime: 15_000,
  });
}

// Every mutation invalidates the whole 'supplier-reco' tree so book + statement +
// summary all re-fetch and stay consistent after any reconciliation action.
function useReconMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-reco'] }),
  });
}

export const useImportSupplierStatement = () =>
  useReconMutation((body) => apiPost('/api/supplier-reconciliation/import', body));

export const useSupplierAutoMatch = () =>
  useReconMutation((body) => apiPost('/api/supplier-reconciliation/auto-match', body));

export const useSupplierManualMatch = () =>
  useReconMutation(({ id, ...body }) => apiPost(`/api/supplier-reconciliation/match/${id}`, body));

export const useSupplierUnmatch = () =>
  useReconMutation(({ id }) => apiPost(`/api/supplier-reconciliation/unmatch/${id}`));

export const useSetSupplierReconStatus = () =>
  useReconMutation(({ id, status }) => apiPost(`/api/supplier-reconciliation/status/${id}`, { status }));

export const useClearSupplierStatement = () =>
  useReconMutation(({ supplier, from, to }) =>
    apiDelete(`/api/supplier-reconciliation/statement?${new URLSearchParams({ supplier, ...(from ? { from } : {}), ...(to ? { to } : {}) })}`));

export const useDeleteSupplierStatementLine = () =>
  useReconMutation(({ id }) => apiDelete(`/api/supplier-reconciliation/line/${id}`));
