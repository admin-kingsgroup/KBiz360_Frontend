import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { loadDirectorDashboard } from '../services/dashboard.service';
import { computeTotalBankBalanceInr } from '../utils/transformers';

export function useDirectorDashboard() {
  const query = useQuery({
    queryKey: ['dashboard', 'director'],
    queryFn: loadDirectorDashboard,
  });

  const totalCashInr = useMemo(
    () => (query.data ? computeTotalBankBalanceInr(query.data.bankAccounts) : 0),
    [query.data],
  );

  return { ...query, totalCashInr };
}
