// React Query hooks for the Post-Dated Cheque (PDC) register + bounce workflow.
//
//   GET  /api/pdc?branch=&direction=&status=
//   GET  /api/pdc/summary?branch=&direction=
//   POST /api/pdc                      create
//   POST /api/pdc/:id/deposit | clear | bounce | represent
//   DEL  /api/pdc/:id

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, getAuthToken } from './api';
import { branchCode } from './useAccounting';

const enabled = () => !!getAuthToken();

export function usePDCs(branch, { direction, status } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['pdc', 'list', code || 'all', direction || '', status || ''],
    queryFn: () => apiGet('/api/pdc', { branch: code, direction, status }),
    enabled: enabled(),
    staleTime: 15_000,
  });
}

export function usePDCSummary(branch, { direction } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['pdc', 'summary', code || 'all', direction || ''],
    queryFn: () => apiGet('/api/pdc/summary', { branch: code, direction }),
    enabled: enabled(),
    staleTime: 15_000,
  });
}

// Every mutation invalidates the whole 'pdc' tree so list + summary stay fresh.
function usePdcMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => qc.invalidateQueries({ queryKey: ['pdc'] }) });
}

export const useCreatePDC    = () => usePdcMutation((body) => apiPost('/api/pdc', body));
export const useDepositPDC   = () => usePdcMutation(({ id, ...body }) => apiPost(`/api/pdc/${id}/deposit`, body));
export const useClearPDC     = () => usePdcMutation(({ id, ...body }) => apiPost(`/api/pdc/${id}/clear`, body));
export const useBouncePDC    = () => usePdcMutation(({ id, ...body }) => apiPost(`/api/pdc/${id}/bounce`, body));
export const useRepresentPDC = () => usePdcMutation(({ id }) => apiPost(`/api/pdc/${id}/represent`));
export const useDeletePDC    = () => usePdcMutation(({ id }) => apiDelete(`/api/pdc/${id}`));
