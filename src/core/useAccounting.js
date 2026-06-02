// React Query hooks for the KBiz360 double-entry accounting engine.
//
// These read the LIVE books produced by the backend posting engine
// (kbiz360-erp-backend → src/features/accounting). Every voucher saved in the
// ERP posts a balanced journal; these reports aggregate those postings:
//
//   Trial Balance   GET /api/accounting/trial-balance
//   Profit & Loss   GET /api/accounting/profit-and-loss
//   Balance Sheet   GET /api/accounting/balance-sheet
//   Day Book        GET /api/accounting/day-book
//   Ledger A/c      GET /api/accounting/ledger?name=
//   28 Groups       GET /api/accounting/groups
//   Chart (ledgers) GET /api/ledgers
//
// No demo-data fallback — empty in, empty out (same contract as useVouchers).

import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';

// The shell passes `branch` as either the string "ALL" or a branch object.
// The backend treats a missing/ALL branch as "all branches".
export function branchCode(branch) {
  if (!branch || branch === 'ALL') return undefined;
  return branch.code || branch;
}

const enabled = () => !!getAuthToken();

export function useTrialBalance(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'trial-balance', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/trial-balance', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

export function useProfitAndLoss(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'pnl', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/profit-and-loss', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

export function useBalanceSheet(branch, { to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'balance-sheet', code || 'all', to || ''],
    queryFn: () => apiGet('/api/accounting/balance-sheet', { branch: code, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

export function useDayBook(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'day-book', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/day-book', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

export function useLedgerStatement(name, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'ledger', name || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/ledger', { name, branch: code, from, to }),
    enabled: enabled() && !!name,
    staleTime: 30_000,
  });
}

export function useLedgerGroups() {
  return useQuery({
    queryKey: ['accounting', 'groups'],
    queryFn: () => apiGet('/api/accounting/groups'),
    enabled: enabled(),
    staleTime: 5 * 60_000, // the 28 groups are effectively static
  });
}

export function useInvoiceGP(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'invoice-gp', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/invoice-gp', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

export function useChartOfAccounts(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['ledgers', code || 'all'],
    queryFn: () => apiGet('/api/ledgers', { branch: code }),
    enabled: enabled(),
    staleTime: 60_000,
  });
}

export function useSalesRegister(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['vouchers', 'sale', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/vouchers', { branch: code, category: 'sale', from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

export function usePurchaseRegister(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['vouchers', 'purchase', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/vouchers', { branch: code, category: 'purchase', from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}
