import { useQuery } from '@tanstack/react-query';
import { loadHrMgrDashboard } from '../services/dashboard.service';
import { getAuthToken } from '../../../core/api';

export function useHrMgrDashboard(branchCode) {
  return useQuery({
    queryKey: ['dashboard', 'hr-mgr', branchCode || 'all'],
    queryFn: () => loadHrMgrDashboard({ branchCode }),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  });
}
