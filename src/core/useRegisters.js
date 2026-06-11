// Generic live CRUD for simple master/register collections (loans, investments,
// cash-flow forecast, …). Backed by the buildCrudRouter REST endpoints.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from './api';

// Open advances/deposits (derived live from voucher on-account) — read-only.
export function useAdvances(branch) {
  const code = branch && branch !== 'ALL' ? (branch.code || branch) : undefined;
  return useQuery({
    queryKey: ['advances', code || 'all'],
    queryFn: () => apiGet('/api/accounting/advances', code ? { branch: code } : {}),
  });
}

export function useCrud(resource, params = {}) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: [resource, params],
    queryFn: () => apiGet(`/api/${resource}`, params),
  });
  const inv = () => qc.invalidateQueries({ queryKey: [resource] });
  const create = useMutation({ mutationFn: (body) => apiPost(`/api/${resource}`, body), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, body }) => apiPut(`/api/${resource}/${id}`, body), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id) => apiDelete(`/api/${resource}/${id}`), onSuccess: inv });
  return { rows: list.data || [], isLoading: list.isLoading, create, update, remove };
}
