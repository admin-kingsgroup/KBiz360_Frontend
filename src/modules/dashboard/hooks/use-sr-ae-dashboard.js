import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { loadSrAeDashboard } from '../services/dashboard.service';
import { sumVoucherTotals } from '../utils/transformers';

export function useSrAeDashboard() {
  const query = useQuery({
    queryKey: ['dashboard', 'sr-ae'],
    queryFn: loadSrAeDashboard,
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
