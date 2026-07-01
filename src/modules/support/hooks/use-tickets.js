import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../../../core/api';
import {
  getTickets, getTicketSummary, createTicket, updateTicket, addTicketComment, deleteTicket,
} from '../api/support.api';

// One namespace so every mutation can invalidate the whole feature at once.
const KEY = ['support', 'tickets'];

/**
 * Server-state for the support-ticket board. Keyed by the filter params so each
 * filter combination caches independently; refetches on window focus are fine for
 * a low-volume collaborative board. UI state (open drawer, form fields) lives in
 * component state, never here.
 */
export function useTickets(params = {}) {
  return useQuery({
    queryKey: [...KEY, 'list', params],
    queryFn: () => getTickets(params),
    enabled: !!getAuthToken(),
    staleTime: 15_000,
  });
}

export function useTicketSummary() {
  return useQuery({
    queryKey: [...KEY, 'summary'],
    queryFn: getTicketSummary,
    enabled: !!getAuthToken(),
    staleTime: 15_000,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => createTicket(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => updateTicket(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => addTicketComment(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteTicket(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
