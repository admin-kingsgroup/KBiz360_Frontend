// React Query hooks for the Collections / Dunning workspace.
//
//   GET  /api/collections/board?branch=         overdue customers + merged follow-up
//   POST /api/collections/upsert                save follow-up (status/promise/notes)
//   POST /api/collections/contact               append a contact-log entry
//   POST /api/collections/reminder-run          batch dunning reminders (logs them)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, getAuthToken } from './api';
import { branchCode } from './useAccounting';

const enabled = () => !!getAuthToken();

export function useCollectionsBoard(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['collections', 'board', code || 'all'],
    queryFn: () => apiGet('/api/collections/board', { branch: code }),
    enabled: enabled(),
    staleTime: 15_000,
  });
}

function useCollectionsMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  });
}

export const useUpsertFollowup = () => useCollectionsMutation((body) => apiPost('/api/collections/upsert', body));
export const useAddContact = () => useCollectionsMutation((body) => apiPost('/api/collections/contact', body));
export const useReminderRun = () => useCollectionsMutation((body) => apiPost('/api/collections/reminder-run', body));
