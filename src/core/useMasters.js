// Generic React Query CRUD hooks for the Tally master collections served by the
// ERP backend (/api/voucher-types, /api/cost-categories, /api/budgets,
// /api/scenarios). One set of hooks, parameterised by `resource` (the API path).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, getAuthToken } from './api';

export function useMasterList(resource, params = {}) {
  return useQuery({
    queryKey: ['master', resource, params],
    queryFn: () => apiGet(`/api/${resource}`, params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  });
}

// Tax-readiness defect COUNTS for a master (suppliers / customers), computed
// server-side over the editable master rows so the dashboard never pulls the full
// list just to count gaps. `resource` is 'suppliers' or 'customers'.
export function useMasterHealth(resource, branch) {
  const code = branch === 'ALL' || !branch ? '' : (branch.code || branch);
  return useQuery({
    queryKey: ['master-health', resource, code || 'all'],
    queryFn: () => apiGet(`/api/${resource}/health`, { branch: code }),
    enabled: !!getAuthToken(),
    staleTime: 60_000,
  });
}

// A few masters are ALSO read live under OTHER query roots, so invalidating only
// ['master', resource] leaves those stale until their staleTime lapses (the
// "new sub-group / ledger doesn't show up in the chart / picker / reports until
// I refresh" bug). The Chart of Accounts (sub-groups + ledgers) is the big one:
//   • sub-groups are stored as Groups → the groups list, the group TREE and the
//     accounting group resolver all change.
//   • a ledger feeds the chart list + ledger label cache (['ledgers'*]), the
//     voucher pickers (['ref','ledger-registry']), the group tree (['groups',…])
//     and — through its opening balance — every books report (['accounting',…]).
// Map each such resource to the extra roots that must refetch on any mutation.
// Re-grouping the chart (moving a sub-group, or re-pointing a ledger's group) changes
// where every report nests its balances, so it MUST bust the FULL books roots — both
// 'accounting' (Trial Balance / P&L / Module-P&L / Balance Sheet / group tree) AND
// 'finance' (migrated Trial Balance + registers). Previously `subgroups` invalidated
// only the narrow ['accounting','groups'] key, which does NOT match the P&L keys
// (['accounting','pnl'], ['accounting','module-pl'], ['accounting','pl-tally']) — so a
// group re-parent refreshed the Chart tree but left the P&L showing the OLD nesting
// until staleTime lapsed (the "re-grouped but P&L still shows old view" bug).
export const MASTER_RELATED_ROOTS = {
  subgroups: [['master', 'groups'], ['groups'], ['accounting'], ['finance']],
  ledgers:   [['ledgers'], ['ref', 'ledger-registry'], ['groups'], ['accounting'], ['finance']],
  // The Party Type master (Client Types / Supplier Categories) is ALSO read live by the
  // customer/supplier dropdowns via usePartyTypes → ['ref','party-types']. Without this,
  // adding/renaming/deactivating a type wouldn't reach those dropdowns until the 5-min
  // reference staleTime lapsed (the "new type doesn't show up until I refresh" bug).
  'party-types': [['ref', 'party-types']],
};

export function useMasterMutations(resource) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['master', resource] });
    for (const key of MASTER_RELATED_ROOTS[resource] || []) qc.invalidateQueries({ queryKey: key });
  };
  return {
    create: useMutation({ mutationFn: (body) => apiPost(`/api/${resource}`, body), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, body }) => apiPut(`/api/${resource}/${id}`, body), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id) => apiDelete(`/api/${resource}/${id}`), onSuccess: invalidate }),
  };
}
