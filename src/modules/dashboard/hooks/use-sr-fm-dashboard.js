import { useQuery } from '@tanstack/react-query';
import { loadSrFmDashboard } from '../services/dashboard.service';

export function useSrFmDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'sr-fm'],
    queryFn: loadSrFmDashboard,
  });
}
