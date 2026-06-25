import { useQuery } from '@tanstack/react-query';
import { loadTrialBalance } from '../services/finance.service';
import { branchCode } from '../../../core/useAccounting';
import { getAuthToken } from '../../../core/api';
import { bc } from '../../../core/styles';

/**
 * Server-state hook for the Trial Balance. The ONLY thing in the feature that
 * touches react-query. Keyed by branch + period so switching either refetches
 * and caches independently. UI state (the period itself, the view mode) lives
 * in the zustand store, never here.
 */
export function useTrialBalance(branch, { from, to, includeZero } = {}) {
  const code = branchCode(branch);
  const cfg = bc(branch);

  const query = useQuery({
    queryKey: ['finance', 'trial-balance', code || 'all', from || '', to || '', includeZero ? 'z1' : 'z0'],
    queryFn: () => loadTrialBalance({ branch: code, from, to, includeZero }),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  });

  return { ...query, currencySymbol: cfg.cur, branchCode: code };
}
