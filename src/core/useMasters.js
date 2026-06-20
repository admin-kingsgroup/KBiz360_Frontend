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
export const MASTER_RELATED_ROOTS = {
  subgroups: [['master', 'groups'], ['groups'], ['accounting', 'groups']],
  ledgers:   [['ledgers'], ['ref', 'ledger-registry'], ['groups'], ['accounting']],
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
