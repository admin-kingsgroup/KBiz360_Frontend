import { useQuery } from '@tanstack/react-query';
import { loadSrFmDashboard } from '../services/dashboard.service';

export function useSrFmDashboard(branchCode) {
  return useQuery({
    queryKey: ['dashboard', 'sr-fm', branchCode || 'all'],
    queryFn: () => loadSrFmDashboard({ branchCode }),
  });
}
