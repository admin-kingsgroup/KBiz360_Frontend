// React Query hooks for the DB-backed reference/master data that used to be
// hardcoded in core/data.js, core/helpers.jsx and core/permissions.js.
// Reference data changes rarely → long staleTime; the bootstrap set is cached
// once for the whole session (see ReferenceProvider.jsx).

import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';
import { ledgerType } from './ledgerClassify';

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
export const useHsnCodes        = () => refQuery('hsn-codes', '/api/hsn-codes', LONG);
export const useFiscalYears     = () => refQuery('fiscal-years', '/api/fiscal-years', REF, { select: (rows) => (rows || []).map((f) => ({ ...f, l: f.label })) });
export const useExpenseLedgers  = () => refQuery('expense-ledgers', '/api/expense-ledgers', REF, { select: (rows) => (rows || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((l) => ({ ...l, id: l.code })) });
export const useExpenseBudgets  = (params = {}) => refQuery('expense-budgets', '/api/expense-budgets', REF, { params });
export const useTaxCalendar     = () => refQuery('tax-calendar', '/api/tax-calendar', REF);
export const useAssetCategories = () => refQuery('asset-categories', '/api/asset-categories', REF);
export const useApprovalRules   = () => refQuery('approval-rules', '/api/approval-rules', REF, { select: (rows) => (rows || []).map((r) => ({ ...r, id: r.ruleId })) });
export const useApprovalLimits  = () => refQuery('approval-limits', '/api/approval-limits', REF, { select: (rows) => (rows || []).map((r) => ({ ...r, dbId: r.id, id: r.alId })) });
export const useDocumentTypes   = () => refQuery('document-types', '/api/document-types', REF, { select: (rows) => (rows || []).map((r) => ({ ...r, id: r.dtId })) });
// dbId keeps the Mongo id the CRUD routes key on (PUT/DELETE /:id) — `id` is
// remapped to the display code (etId/cfId) for the legacy screen shapes.
export const useEmailTemplates  = () => refQuery('email-templates', '/api/email-templates', REF, { select: (rows) => (rows || []).map((r) => ({ ...r, dbId: r.id, id: r.etId })) });
export const useCustomFields    = () => refQuery('custom-fields', '/api/custom-fields', REF, { select: (rows) => (rows || []).map((r) => ({ ...r, dbId: r.id, id: r.cfId })) });
export const useFieldAccess     = () => refQuery('field-access', '/api/field-access', REF);
export const useAdmReasonCodes  = () => refQuery('adm-reason-codes', '/api/adm-reason-codes', REF, { select: (rows) => Object.fromEntries((rows || []).map((r) => [r.code, r])) });
export const useNumberingSeries = () => refQuery('numbering-series', '/api/numbering-series', REF);
export const useSalespeople     = () => refQuery('salespeople', '/api/salespeople', REF, { select: (rows) => (rows || []).map((s) => ({ ...s, id: s.spId })) });
export const useRoles           = () => refQuery('roles', '/api/roles', LONG);
export const useRolesMeta       = () => refQuery('roles-meta', '/api/roles/meta', LONG);
export const useUsersAdmin      = () => refQuery('users', '/api/auth/users', REF);
// EVERY user across CRM + ERP with per-app login toggles (Settings → Users & Roles →
// App Access). Distinct from useUsersAdmin (which lists only ERP/Books access grants).
export const useUserAccess      = () => refQuery('user-access', '/api/user-access', REF);

// app-config convenience: { INR:{symbol,toINR}, ... }
export const useCurrencies      = () => refQuery('currencies', '/api/app-config/currencies', LONG);
export const useAppConfig       = (key) => useQuery({ queryKey: ['ref', 'app-config', key], queryFn: () => apiGet(`/api/app-config/${key}`), enabled: enabled() && !!key, staleTime: LONG });

// Live chart of accounts mapped to the legacy LEDGER_REGISTRY shape (adds a
// derived `type` Bank/Cash/Debtor/Creditor) so the voucher pickers keep working.
const branchCodeOf = (b) => (!b || b === 'ALL') ? undefined : (b.code || b);
// Derive the legacy `type` token (Bank/Cash/Creditor/Debtor/Expense/Asset/…)
// the voucher pickers filter on, from the chart group + accounting nature.
// NOTE: the API `nature` is asset|liability|income|expense and `drCr` is the
// natural side (Dr/Cr) — neither is the 'Cr'/'Dr' token the old code tested, so
// every non-bank ledger used to collapse to 'Ledger'. The classification rule
// lives in ./ledgerClassify (pure + unit-tested); see ledgerType() for why the
// bank/cash name fallback is gated on nature.
function mapLedger(l) {
  return {
    id: l.id, code: l.code, name: l.name, group: l.group, subGroup: l.subGroup || '',
    rootGroup: l.rootGroup || l.group, // primary group — feeds Debtor/Creditor classification for sub-grouped parties
    nature: l.nature, statement: l.statement, drCr: l.drCr, type: ledgerType(l), branch: l.branch, currency: l.currency,
  };
}
export const useLedgerRegistry = (branch) => useQuery({
  queryKey: ['ref', 'ledger-registry', branchCodeOf(branch) || 'all'],
  queryFn: () => apiGet('/api/ledgers', { branch: branchCodeOf(branch) }),
  enabled: enabled(), staleTime: REF, select: (rows) => (rows || []).map(mapLedger),
});
