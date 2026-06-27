import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { loadSrAeDashboard } from '../services/dashboard.service';
import { sumVoucherTotals } from '../utils/transformers';
import { getAuthToken } from '../../../core/api';

export function useSrAeDashboard(branchCode) {
  const query = useQuery({
    queryKey: ['dashboard', 'sr-ae', branchCode || 'all'],
    queryFn: () => loadSrAeDashboard({ branchCode }),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  });

  const totals = useMemo(() => {
    if (!query.data) return { todayTotal: 0, todayValue: 0 };
    return {
      todayTotal: sumVoucherTotals(query.data.todayVouchers, 'total'),
      todayValue: sumVoucherTotals(query.data.todayVouchers, 'value'),
    };
  }, [query.data]);

  return { ...query, ...totals };
}
