// React Query hooks for the ADM / ACM register (BSP Agent Debit / Credit Memo
// tracker). The dispute lifecycle lives here; Accept spawns a PENDING gated
// ADM/ACM voucher that posts through the normal voucher approval queue.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, getAuthToken } from './api';

const enabled = () => !!getAuthToken();
const keyOf = (kind, branch) => ['adm-memos', kind || 'all', branch || 'all'];

// List memos of a kind ('adm' | 'acm'), optionally branch-scoped.
export function useAdmMemos(kind, branch) {
  const brCode = (!branch || branch === 'ALL') ? undefined : (branch.code || branch);
  return useQuery({
    queryKey: keyOf(kind, brCode),
    queryFn: () => apiGet('/api/adm-memos', { kind, branch: brCode }),
    enabled: enabled(), staleTime: 60_000,
  });
}

// Invalidate the register list + (for Accept) the voucher/accounting caches.
function useMemoMutation(fn, { touchVouchers = false } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adm-memos'] });
      if (touchVouchers) {
        qc.invalidateQueries({ queryKey: ['vouchers'] });
        qc.invalidateQueries({ queryKey: ['accounting'] });
        qc.invalidateQueries({ queryKey: ['groups'] });
        qc.invalidateQueries({ queryKey: ['finance'] }); // migrated finance registers + Trial Balance
      }
    },
  });
}

export const useCreateAdmMemo  = () => useMemoMutation((body) => apiPost('/api/adm-memos', body));
export const useUpdateAdmMemo  = () => useMemoMutation(({ id, body }) => apiPut(`/api/adm-memos/${id}`, body));
export const useDisputeAdmMemo = () => useMemoMutation(({ id, note, by }) => apiPost(`/api/adm-memos/${id}/dispute`, { note, by }));
export const useRejectAdmMemo  = () => useMemoMutation(({ id, note }) => apiPost(`/api/adm-memos/${id}/reject`, { note }));
// Accept → spawns the gated voucher → touches the voucher/accounting caches.
export const useAcceptAdmMemo  = () => useMemoMutation(({ id, by }) => apiPost(`/api/adm-memos/${id}/accept`, { by }), { touchVouchers: true });
export const useDeleteAdmMemo  = () => useMemoMutation((id) => apiDelete(`/api/adm-memos/${id}`));
