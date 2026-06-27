import { useQuery } from '@tanstack/react-query';
import { loadSrFmDashboard } from '../services/dashboard.service';
import { getAuthToken } from '../../../core/api';

export function useSrFmDashboard(branchCode) {
  return useQuery({
    queryKey: ['dashboard', 'sr-fm', branchCode || 'all'],
    queryFn: () => loadSrFmDashboard({ branchCode }),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  });
}
