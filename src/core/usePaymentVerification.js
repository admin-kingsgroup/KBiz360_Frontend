// React Query hooks for the finance Payment-Verification inbox in KBiz Books.
// Backed by the CRM payment endpoints (see crmApi.js): the queue lists payments
// salespeople submitted from CRM; verify/reject/clarify drive CRM's own logic.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmGet, crmPost } from './crmApi';
import { getAuthToken } from './api';

const QUEUE_KEY = ['crm', 'finance-queue'];

export function useFinanceQueue() {
  return useQuery({
    queryKey: QUEUE_KEY,
    queryFn: () => crmGet('/payments/finance-queue'),
    enabled: !!getAuthToken(),
    staleTime: 15_000,
  });
}

export function usePaymentActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: QUEUE_KEY });
  return {
    verify:  useMutation({ mutationFn: (id) => crmPost(`/payments/${id}/verify`), onSuccess: invalidate }),
    reject:  useMutation({ mutationFn: ({ id, reason, notes }) => crmPost(`/payments/${id}/reject`, { reason, notes }), onSuccess: invalidate }),
    clarify: useMutation({ mutationFn: ({ id, note }) => crmPost(`/payments/${id}/clarify`, { note }), onSuccess: invalidate }),
  };
}
