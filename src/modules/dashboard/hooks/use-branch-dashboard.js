import { useQuery } from '@tanstack/react-query';
import { loadBranchDashboard } from '../services/dashboard.service';
import { bc } from '../../../core/styles';
import { getAuthToken } from '../../../core/api';

export function useBranchDashboard(branch) {
  const cfg = bc(branch);
  const branchCode = branch === 'ALL' ? null : branch?.code;
  const isIndia = cfg.taxType === 'GST';

  const query = useQuery({
    queryKey: ['dashboard', 'branch', branchCode || 'ALL'],
    queryFn: () => loadBranchDashboard({ branchCode, branch }),
    enabled: !!getAuthToken(),   // don't fire before auth (parity with core/useAccounting hooks)
    staleTime: 30_000,           // avoid refetch-on-every-mount thrash
  });

  return {
    ...query,
    branchCode,
    currencySymbol: cfg.cur,
    isIndia,
  };
}
