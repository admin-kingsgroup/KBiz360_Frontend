import { useQuery } from '@tanstack/react-query';
import { loadHrMgrDashboard } from '../services/dashboard.service';

export function useHrMgrDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'hr-mgr'],
    queryFn: loadHrMgrDashboard,
  });
}
