// React Query hooks for Tally reconciliation — any ERP ledger vs an imported
// Tally ledger export.
//   GET  /api/tally-reconciliation/book?ledger=&branch=&from=&to=
//   GET  /api/tally-reconciliation/tally?ledger=&from=&to=
//   GET  /api/tally-reconciliation/summary?ledger=&from=&to=
//   POST /api/tally-reconciliation/import | auto-match | match/:id | unmatch/:id | status/:id
//   DEL  /api/tally-reconciliation/tally | line/:id
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, getAuthToken } from './api';
import { branchCode } from './useAccounting';

const enabled = () => !!getAuthToken();

export function useTallyBook(ledger, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['tally-reco', 'book', ledger || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/tally-reconciliation/book', { ledger, branch: code, from, to }),
    enabled: enabled() && !!ledger, staleTime: 15_000,
  });
}
export function useTallyRows(ledger, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['tally-reco', 'tally', ledger || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/tally-reconciliation/tally', { ledger, branch: code, from, to }),
    enabled: enabled() && !!ledger, staleTime: 15_000,
  });
}
export function useTallyRecoSummary(ledger, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['tally-reco', 'summary', ledger || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/tally-reconciliation/summary', { ledger, branch: code, from, to }),
    enabled: enabled() && !!ledger, staleTime: 15_000,
  });
}

function useReco(fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['tally-reco'] }) });
}
export const useImportTally        = () => useReco((body) => apiPost('/api/tally-reconciliation/import', body));
export const useTallyAutoMatch     = () => useReco((body) => apiPost('/api/tally-reconciliation/auto-match', body));
export const useTallyManualMatch   = () => useReco(({ id, ...b }) => apiPost(`/api/tally-reconciliation/match/${id}`, b));
export const useTallyGroupMatch    = () => useReco(({ id, books }) => apiPost(`/api/tally-reconciliation/match-group/${id}`, { books }));
export const useTallyUnmatch       = () => useReco(({ id }) => apiPost(`/api/tally-reconciliation/unmatch/${id}`));
export const useSetTallyRecoStatus = () => useReco(({ id, status }) => apiPost(`/api/tally-reconciliation/status/${id}`, { status }));
export const useClearTally         = () => useReco(({ ledger, branch }) => apiDelete(`/api/tally-reconciliation/tally?${new URLSearchParams({ ledger, ...(branch ? { branch: branchCode(branch) } : {}) })}`));
export const useDeleteTallyLine    = () => useReco(({ id }) => apiDelete(`/api/tally-reconciliation/line/${id}`));
