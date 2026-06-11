import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { loadDirectorDashboard } from '../services/dashboard.service';
import { computeTotalBankBalanceInr } from '../utils/transformers';

export function useDirectorDashboard({ range = 'month', scope = 'ALL', from, to } = {}) {
  const branchCode = scope && scope !== 'ALL' ? scope : undefined;
  const query = useQuery({
    queryKey: ['dashboard', 'director', range, scope, from || '', to || ''],
    queryFn: () => loadDirectorDashboard({ range, branchCode, from, to }),
  });

  const totalCashInr = useMemo(
    () => (query.data ? computeTotalBankBalanceInr(query.data.bankAccounts) : 0),
    [query.data],
  );

  return { ...query, totalCashInr };
}
