// React Query hooks for the Bank Reconciliation module.
//
// Reads the LIVE bank ledger (book side) from the double-entry engine and the
// imported bank statement (bank side) from the new /api/bank-reconciliation
// endpoints, then drives auto/manual matching. No demo-data fallback — empty in,
// empty out (same contract as useAccounting / useVouchers).
//
//   GET  /api/bank-reconciliation/ledgers
//   GET  /api/bank-reconciliation/book?ledger=&branch=&from=&to=
//   GET  /api/bank-reconciliation/statement?ledger=&from=&to=
//   GET  /api/bank-reconciliation/summary?ledger=&from=&to=
//   POST /api/bank-reconciliation/import | auto-match | match/:id | unmatch/:id | status/:id
//   DEL  /api/bank-reconciliation/statement | line/:id

import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, getAuthToken } from './api';
import { branchCode } from './useAccounting';

const enabled = () => !!getAuthToken();

export function useBankLedgers(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['bank-reco', 'ledgers', code || 'all'],
    queryFn: () => apiGet('/api/bank-reconciliation/ledgers', { branch: code }),
    enabled: enabled(),
    staleTime: 60_000,
  });
}

export function useBankBook(ledger, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['bank-reco', 'book', ledger || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/bank-reconciliation/book', { ledger, branch: code, from, to }),
    enabled: enabled() && !!ledger,
    staleTime: 15_000,
  });
}

export function useBankStatement(ledger, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['bank-reco', 'statement', ledger || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/bank-reconciliation/statement', { ledger, branch: code, from, to }),
    enabled: enabled() && !!ledger,
    staleTime: 15_000,
  });
}

// Formal Bank Reconciliation Statement (printable) for a ledger + period.
export function useBankBRS(ledger, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['bank-reco', 'brs', ledger || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/bank-reconciliation/brs', { ledger, branch: code, from, to }),
    enabled: enabled() && !!ledger,
    staleTime: 15_000,
  });
}

export function useBankReconSummary(ledger, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['bank-reco', 'summary', ledger || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/bank-reconciliation/summary', { ledger, branch: code, from, to }),
    enabled: enabled() && !!ledger,
    staleTime: 15_000,
  });
}

// Aggregate reconciliation health across EVERY bank ledger of the branch — how many
// accounts carry an unreconciled difference, the total of those differences, and the
// open (unmatched) line count. Powers the dashboard's Exception Radar without the user
// picking a single bank. Each per-ledger query shares the exact key of
// useBankReconSummary, so the all-accounts rollup and this aggregate dedupe (no extra
// network round-trips).
export function useBankReconAggregate(branch, { from, to } = {}) {
  const code = branchCode(branch);
  const ledgers = useBankLedgers(branch).data || [];
  const results = useQueries({
    queries: ledgers.map((lg) => ({
      queryKey: ['bank-reco', 'summary', lg.name || '', code || 'all', from || '', to || ''],
      queryFn: () => apiGet('/api/bank-reconciliation/summary', { ledger: lg.name, branch: code, from, to }),
      enabled: enabled() && !!lg.name,
      staleTime: 15_000,
    })),
  });
  const summaries = results.map((r) => r.data).filter(Boolean);
  const withDiff = summaries.filter((s) => Math.abs(Number(s.differenceAmount) || 0) >= 1);
  const openLines = summaries.reduce((n, s) => n + ((s.counts?.bookUnreconciled || 0) + (s.counts?.statementUnreconciled || 0)), 0);
  return {
    ledgerCount: ledgers.length,
    diffCount: withDiff.length,
    diffAmount: withDiff.reduce((sum, s) => sum + Math.abs(Number(s.differenceAmount) || 0), 0),
    openLines,
    isLoading: results.some((r) => r.isLoading),
  };
}

// Manual "Re-fetch ERP Books" — forces the book/statement/summary/BRS queries to
// reload from the live ledger. Use after correcting a voucher (esp. one fixed in
// another tab/session, where this client never ran invalidateBooks). Returns a
// stable callback that resolves once the active queries have refetched.
export function useRefreshBankReco() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['bank-reco'] });
}

// Every mutation invalidates the whole 'bank-reco' tree so book + statement +
// summary all re-fetch and stay consistent after any reconciliation action.
function useReconMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-reco'] }),
  });
}

export const useImportStatement = () =>
  useReconMutation((body) => apiPost('/api/bank-reconciliation/import', body));

export const useAutoMatch = () =>
  useReconMutation((body) => apiPost('/api/bank-reconciliation/auto-match', body));

export const useManualMatch = () =>
  useReconMutation(({ id, ...body }) => apiPost(`/api/bank-reconciliation/match/${id}`, body));

// N book legs → one statement line (a split in our books = one consolidated bank line).
export const useGroupMatch = () =>
  useReconMutation(({ id, books }) => apiPost(`/api/bank-reconciliation/match-group/${id}`, { books }));

export const useUnmatch = () =>
  useReconMutation(({ id }) => apiPost(`/api/bank-reconciliation/unmatch/${id}`));

// Bulk un-reconcile: release every match in the ledger + period so bank-reconciled
// receipts/payments become revocable/editable again. Does not delete any line.
export const useUnmatchAll = () =>
  useReconMutation(({ ledger, branch, from, to }) =>
    apiPost('/api/bank-reconciliation/unmatch-all', { ledger, branch, from, to }));

export const useSetReconStatus = () =>
  useReconMutation(({ id, status }) => apiPost(`/api/bank-reconciliation/status/${id}`, { status }));

export const useClearStatement = () =>
  useReconMutation(({ ledger, branch, from, to }) =>
    apiDelete(`/api/bank-reconciliation/statement?${new URLSearchParams({ ledger, ...(branch ? { branch } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) })}`));

export const useDeleteStatementLine = () =>
  useReconMutation(({ id }) => apiDelete(`/api/bank-reconciliation/line/${id}`));
