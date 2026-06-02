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

export function useMasterMutations(resource) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['master', resource] });
  return {
    create: useMutation({ mutationFn: (body) => apiPost(`/api/${resource}`, body), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, body }) => apiPut(`/api/${resource}/${id}`, body), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id) => apiDelete(`/api/${resource}/${id}`), onSuccess: invalidate }),
  };
}
