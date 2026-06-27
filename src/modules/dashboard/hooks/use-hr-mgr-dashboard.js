import { useQuery } from '@tanstack/react-query';
import { loadHrMgrDashboard } from '../services/dashboard.service';
import { getAuthToken } from '../../../core/api';

export function useHrMgrDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'hr-mgr'],
    queryFn: loadHrMgrDashboard,
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  });
}
