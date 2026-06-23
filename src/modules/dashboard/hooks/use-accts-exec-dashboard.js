import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { loadAcctsExecDashboard } from '../services/dashboard.service';

const EMPTY_BRANCH = { receipt: 0, payment: 0, journal: 0, total: 0, value: 0 };

export function useAcctsExecDashboard(branchCode) {
  const query = useQuery({
    queryKey: ['dashboard', 'accts-exec', branchCode || ''],
    queryFn: () => loadAcctsExecDashboard({ branchCode }),
  });

  const branchData = useMemo(
    () => query.data?.todayVouchers?.[branchCode] || EMPTY_BRANCH,
    [query.data, branchCode],
  );

  return { ...query, branchData };
}
