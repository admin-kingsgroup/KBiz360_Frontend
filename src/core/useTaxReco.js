// React Query hooks for Tax reconciliation (GSTR-3B/VAT vs books, GSTR-1 vs 3B,
// TDS vs 26AS). One reconcile read per (branch, period, mode) + figure upsert.
//   GET  /api/tax-reconciliation?branch=&period=YYYY-MM&mode=
//   POST /api/tax-reconciliation/figure   { branch, period, mode, source, head, amount, note }
//   DEL  /api/tax-reconciliation/figure/:id
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, getAuthToken } from './api';
import { branchCode } from './useAccounting';

export function useTaxReco(branch, period, mode) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['tax-reco', code || 'all', period || '', mode || ''],
    queryFn: () => apiGet('/api/tax-reconciliation', { branch: code, period, mode }),
    enabled: !!getAuthToken() && !!period && !!mode,
    staleTime: 15_000,
  });
}

export function useUpsertTaxFigure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiPost('/api/tax-reconciliation/figure', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-reco'] }),
  });
}
