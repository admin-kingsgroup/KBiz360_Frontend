import { useQuery } from '@tanstack/react-query';
import { loadBranchDashboard } from '../services/dashboard.service';
import { bc } from '../../../core/styles';

export function useBranchDashboard(branch) {
  const cfg = bc(branch);
  const branchCode = branch === 'ALL' ? null : branch?.code;
  const isIndia = cfg.taxType === 'GST';

  const query = useQuery({
    queryKey: ['dashboard', 'branch', branchCode || 'ALL'],
    queryFn: () => loadBranchDashboard({ branchCode, branch }),
  });

  return {
    ...query,
    branchCode,
    currencySymbol: cfg.cur,
    isIndia,
  };
}
