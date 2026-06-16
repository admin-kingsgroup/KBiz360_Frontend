import { useQuery } from '@tanstack/react-query';
import { loadVoucherRegister } from '../services/finance.service';
import { branchCode } from '../../../core/useAccounting';
import { getAuthToken } from '../../../core/api';
import { bc } from '../../../core/styles';

/**
 * Server-state hook for a voucher register (receipt / payment / contra / journal).
 * Keyed by category + branch + period so each register caches independently.
 */
export function useVoucherRegister(branch, category, { from, to } = {}) {
  const code = branchCode(branch);
  const cfg = bc(branch);

  const query = useQuery({
    queryKey: ['finance', 'voucher-register', category, code || 'all', from || '', to || ''],
    queryFn: () => loadVoucherRegister({ branch: code, category, from, to }),
    enabled: !!getAuthToken() && !!category,
    staleTime: 30_000,
  });

  return { ...query, currencySymbol: cfg.cur, branchCode: code };
}
