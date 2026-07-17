// React Query hook for Inter-branch reconciliation — pairs each branch's two
// directional current-account balances and flags any that don't net to zero.
//   GET /api/interbranch-reconciliation?from=&to=
import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';

export function useInterBranchReco({ from, to } = {}) {
  return useQuery({
    queryKey: ['interbranch-reco', from || '', to || ''],
    queryFn: () => apiGet('/api/interbranch-reconciliation', { from, to }),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  });
}

// Line-level: every INB deal by Link No (booked vs open/unbooked) — the exact
// missing voucher behind a pair mismatch, from the INB Link registry.
export function useInterBranchLinks({ branch } = {}) {
  return useQuery({
    // Keyed under 'inb' on purpose: this is the SAME /reconcile feed the INB screens read, so
    // it must share their cache namespace. Every INB mutation (convert / return / delete /
    // book) invalidates ['inb'] — under its own 'interbranch-links' key this query missed all
    // of them and served link data up to its 30s staleTime out of date, so a deal converted
    // on one screen still read 'open' here.
    queryKey: ['inb', 'reconcile-links', branch || ''],
    queryFn: () => apiGet('/api/inter-branch/reconcile', { branch }),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  });
}
