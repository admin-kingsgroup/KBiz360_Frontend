// React Query hook for Inter-branch reconciliation — pairs each branch's two
// directional current-account balances and flags any that don't net to zero.
//   GET /api/interbranch-reconciliation?from=&to=
import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';

export function useInterBranchReco({ from, to } = {}) {
  return useQuery({
    queryKey: ['interbranch-reco', from || '', to || ''],
    queryFn: () => apiGet('/api/interbranch-reconciliation', { from, to }),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  });
}
