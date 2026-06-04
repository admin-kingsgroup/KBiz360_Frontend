// React Query hooks for the DB-backed reference/master data that used to be
// hardcoded in core/data.js, core/helpers.jsx and core/permissions.js.
// Reference data changes rarely → long staleTime; the bootstrap set is cached
// once for the whole session (see ReferenceProvider.jsx).

import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';

const REF = 5 * 60_000;        // 5 min — reference masters
const LONG = 30 * 60_000;      // 30 min — near-static (currencies, roles meta)
const enabled = () => !!getAuthToken();

// `select` normalises API field names back to the legacy shapes the existing
// screens expect (e.g. expense ledgers keyed by `id`, FY label as `l`), so
// consumers need no further changes.
function refQuery(key, path, staleTime = REF, { params = {}, select } = {}) {
  return useQuery({ queryKey: ['ref', key, params], queryFn: () => apiGet(path, params), enabled: enabled(), staleTime, select });
}

export const useBranches        = () => refQuery('branches', '/api/branches', LONG);
export const useCompanyProfiles = () => refQuery('company-profile', '/api/company-profile', LONG);
export const useFiscalYears     = () => refQuery('fiscal-years', '/api/fiscal-years', REF, { select: (rows) => (rows || []).map((f) => ({ ...f, l: f.label })) });
export const useExpenseLedgers  = () => refQuery('expense-ledgers', '/api/expense-ledgers', REF, { select: (rows) => (rows || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((l) => ({ ...l, id: l.code })) });
export const useExpenseBudgets  = (params = {}) => refQuery('expense-budgets', '/api/expense-budgets', REF, { params });
export const useTaxCalendar     = () => refQuery('tax-calendar', '/api/tax-calendar', REF);
export const useAssetCategories = () => refQuery('asset-categories', '/api/asset-categories', REF);
export const useApprovalRules   = () => refQuery('approval-rules', '/api/approval-rules', REF, { select: (rows) => (rows || []).map((r) => ({ ...r, id: r.ruleId })) });
export const useAdmReasonCodes  = () => refQuery('adm-reason-codes', '/api/adm-reason-codes', REF, { select: (rows) => Object.fromEntries((rows || []).map((r) => [r.code, r])) });
export const useNumberingSeries = () => refQuery('numbering-series', '/api/numbering-series', REF);
export const useSalespeople     = () => refQuery('salespeople', '/api/salespeople', REF, { select: (rows) => (rows || []).map((s) => ({ ...s, id: s.spId })) });
export const useRoles           = () => refQuery('roles', '/api/roles', LONG);
export const useRolesMeta       = () => refQuery('roles-meta', '/api/roles/meta', LONG);
export const useUsersAdmin      = () => refQuery('users', '/api/auth/users', REF);

// app-config convenience: { INR:{symbol,toINR}, ... }
export const useCurrencies      = () => refQuery('currencies', '/api/app-config/currencies', LONG);
export const useAppConfig       = (key) => useQuery({ queryKey: ['ref', 'app-config', key], queryFn: () => apiGet(`/api/app-config/${key}`), enabled: enabled() && !!key, staleTime: LONG });

// Live chart of accounts mapped to the legacy LEDGER_REGISTRY shape (adds a
// derived `type` Bank/Cash/Debtor/Creditor) so the voucher pickers keep working.
const branchCodeOf = (b) => (!b || b === 'ALL') ? undefined : (b.code || b);
function mapLedger(l) {
  const g = (l.group || '').toLowerCase();
  const n = (l.name || '').toLowerCase();
  const type = /bank/.test(g) || /bank/.test(n) ? 'Bank'
    : /cash/.test(g) || /cash/.test(n) ? 'Cash'
    : l.nature === 'Cr' ? 'Creditor' : l.nature === 'Dr' ? 'Debtor' : 'Ledger';
  return { id: l.id, code: l.code, name: l.name, group: l.group, nature: l.nature, type, branch: l.branch, currency: l.currency };
}
export const useLedgerRegistry = (branch) => useQuery({
  queryKey: ['ref', 'ledger-registry', branchCodeOf(branch) || 'all'],
  queryFn: () => apiGet('/api/ledgers', { branch: branchCodeOf(branch) }),
  enabled: enabled(), staleTime: REF, select: (rows) => (rows || []).map(mapLedger),
});
