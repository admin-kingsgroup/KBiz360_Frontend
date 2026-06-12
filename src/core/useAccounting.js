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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiPost, getAuthToken } from './api';

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

// GST/VAT return view — Output−Input tax + withholding (WHT/TDS) + TCS for a
// branch + period. Regime-aware (VAT branches return VAT, India CGST/SGST/IGST).
export function useTaxSummary(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'tax-summary', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/tax-summary', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

// Budget vs actual (indirect-expense heads) — Director "Budget vs Expense" dashboard.
export function useBudgetVsActual(branch, { from, to, fy } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'budget-vs-actual', code || 'all', from || '', to || '', fy || ''],
    queryFn: () => apiGet('/api/accounting/budget-vs-actual', { branch: code, from, to, fy }),
    enabled: enabled(), staleTime: 30_000,
  });
}

// Sales / GP / Collections vs target — Director "vs Target" dashboards.
export function useTargetsVsActual(branch, metric = 'sales', { from, to, fy } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'targets-vs-actual', code || 'all', metric, from || '', to || '', fy || ''],
    queryFn: () => apiGet('/api/accounting/targets-vs-actual', { branch: code, metric, from, to, fy }),
    enabled: enabled(), staleTime: 30_000,
  });
}

// Targets master (set/list).
export function useSalesTargets(branch, fy, metric) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['sales-targets', code || 'all', fy || '', metric || ''],
    queryFn: () => apiGet('/api/sales-targets', { branch: code, fy, metric }),
    enabled: enabled(),
  });
}
export function useSaveTargets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiPut('/api/sales-targets/bulk', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-targets'] }); qc.invalidateQueries({ queryKey: ['accounting', 'targets-vs-actual'] }); },
  });
}

export function useBalanceSheet(branch, { to, includeZero } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'balance-sheet', code || 'all', to || '', !!includeZero],
    queryFn: () => apiGet('/api/accounting/balance-sheet', { branch: code, to, ...(includeZero ? { includeZero: 1 } : {}) }),
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

// Full Chart-of-Accounts hierarchy: primary groups → (system) groups → custom
// sub-groups → ledgers. Authoritative nesting (same buildTree the BS/P&L use).
export function useGroupTree(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['groups', 'tree', code || 'all'],
    queryFn: () => apiGet('/api/groups/tree', { branch: code }),
    enabled: enabled(),
    staleTime: 60_000,
  });
}

// Voucher approval queue (gated types: payment/receipt/contra/journal/CN/DN/PXP).
// Returns { counts, status, entries, byGroup, bySubGroup, byLedger }.
export function useVoucherApprovals(branch, status = 'pending', { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['vouchers', 'approvals', code || 'all', status, from || '', to || ''],
    queryFn: () => apiGet('/api/vouchers/approvals', { branch: code, status, from, to }),
    enabled: enabled(),
    staleTime: 15_000,
  });
}
export function useApproveVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approver }) => apiPost(`/api/vouchers/${id}/approve`, { approver }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vouchers'] }); qc.invalidateQueries({ queryKey: ['accounting'] }); qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}
export function useRejectVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, by, reason }) => apiPost(`/api/vouchers/${id}/reject`, { by, reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vouchers'] }); qc.invalidateQueries({ queryKey: ['accounting'] }); },
  });
}
export function useDeleteVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, by, reason }) => apiPost(`/api/vouchers/${id}/delete`, { by, reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vouchers'] }); qc.invalidateQueries({ queryKey: ['accounting'] }); qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}
export function useApproveMany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, approver }) => apiPost('/api/vouchers/approve-many', { ids, approver }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vouchers'] }); qc.invalidateQueries({ queryKey: ['accounting'] }); qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}
export function useApproveAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ branch, category, approver }) => {
      const code = branchCode(branch);
      const qs = new URLSearchParams({ ...(code ? { branch: code } : {}), ...(category ? { category } : {}) }).toString();
      return apiPost(`/api/vouchers/approve-all${qs ? '?' + qs : ''}`, { approver });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vouchers'] }); qc.invalidateQueries({ queryKey: ['accounting'] }); qc.invalidateQueries({ queryKey: ['groups'] }); },
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

// Module-wise P&L: Sales/COGS/Gross Profit per product module (Flights, Holiday,
// Hotels, Visa…) + indirect overheads + a Gross→Net profit bridge. Live from the
// double-entry engine (GET /api/accounting/module-pl).
export function useModulePL(branch, { from, to, includeZero } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'module-pl', code || 'all', from || '', to || '', !!includeZero],
    queryFn: () => apiGet('/api/accounting/module-pl', { branch: code, from, to, ...(includeZero ? { includeZero: 1 } : {}) }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

// Flat per-file Gross Profit list for the multi-tab GP Report: one row per
// booking file (vouchers sharing a Link No), enriched with module / airline /
// destination / client / supplier / consultant / branch so the UI pivots every
// tab client-side. GET /api/accounting/gp-bills?branch=&from=&to=.
export function useGpBills(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'gp-bills', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/gp-bills', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

// Revenue & GP ranked by destination. GET /api/accounting/yield-by-destination.
export function useYieldByDestination(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'yield-destination', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/yield-by-destination', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

// Lifetime value / recency per customer. GET /api/accounting/customer-ltv.
export function useCustomerLtv(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'customer-ltv', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/customer-ltv', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

// ABC / Pareto split (by=customer|supplier|destination). GET /api/accounting/abc-analysis.
export function useAbcAnalysis(branch, { from, to, by = 'customer' } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'abc', by, code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/abc-analysis', { branch: code, from, to, by }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

// Year-over-Year P&L: current window vs same window last year. GET /api/accounting/yoy.
export function useYearOverYear(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'yoy', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/yoy', { branch: code, from, to }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

// AR / AP ageing (receivables & payables, FIFO, as-of today). GET /api/accounting/ageing.
export function useAgeing(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'ageing', code || 'all'],
    queryFn: () => apiGet('/api/accounting/ageing', { branch: code }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

// One-time: re-tag already-imported sale/purchase vouchers with their cost centre
// (derived from the saved line.meta Ticket Type / Service Type / Country).
export function useBackfillCostCenters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost('/api/accounting/backfill-cost-centers'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounting'] }); },
  });
}

// Seeded, read-only cost-centre catalogue (7 modules + Int'l/Domestic sub-centres
// for Flights & Holiday). GET /api/cost-centers → { costCenters, modules }.
export function useCostCenters() {
  return useQuery({
    queryKey: ['cost-centers'],
    queryFn: () => apiGet('/api/cost-centers'),
    enabled: enabled(),
    staleTime: 5 * 60_000, // seeded & immutable
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

// Open (unsettled) bills for a party, for the bill-wise allocation panel on the
// Receipt / Payment vouchers. side 'customer' → debtor's open sale bills (Receipt);
// side 'supplier' → creditor's open purchase bills (Payment). Returns
// { party, side, bills:[{billVno,date,total,allocated,outstanding,status,ageDays}], advances }.
// Needs a real party name + a specific branch (a voucher belongs to one branch).
// `excludeId` (optional) — when editing a receipt/payment, pass its id so the
// open-bills query ignores this voucher's own settlement; the bills it already
// cleared then show at full outstanding and its allocation can be re-edited.
export function useOpenBills(party, branch, side = 'customer', excludeId) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['vouchers', 'open-bills', code || 'all', side, party || '', excludeId || ''],
    queryFn: () => apiGet('/api/vouchers/open-bills', { party, branch: code, side, excludeId }),
    enabled: enabled() && !!party && !!code,
    staleTime: 15_000,
  });
}

// Whole-book unsettled bills + on-account advances (the Outstanding & On-Account
// dashboard). Bills settle ONLY by explicit allocation — no FIFO. Returns
// { salesBills, purchaseBills, onAccountReceipts, onAccountPayments, totals }.
export function useOutstanding(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['vouchers', 'outstanding', code || 'all'],
    queryFn: () => apiGet('/api/vouchers/outstanding', { branch: code }),
    enabled: enabled(),
    staleTime: 20_000,
  });
}

// Settle an on-account receipt/payment against open bills (bill-wise). Updates the
// allocation sub-ledger only — no GL re-post.
export function useSettleAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, allocations }) => apiPut(`/api/vouchers/${id}/settle`, { allocations }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
    },
  });
}

// Live dashboard auto-alerts (overdue, on-account, pending, idle ledgers, masters
// missing credit terms, …). { generatedAt, counts, alerts:[{severity,type,title,detail,link}] }.
export function useAlerts(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['alerts', code || 'all'],
    queryFn: () => apiGet('/api/alerts', { branch: code }),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

// Single voucher (drill-down target) — view + edit.
export function useVoucher(id) {
  return useQuery({
    queryKey: ['voucher', id],
    queryFn: () => apiGet(`/api/vouchers/${id}`),
    enabled: enabled() && !!id,
    staleTime: 10_000,
  });
}

// Live full-JV preview for the editor: posts the (possibly edited) voucher body and
// returns every Dr/Cr leg + totals + balanced flag, even when it doesn't balance.
export function useVoucherPreview(body) {
  const key = body ? JSON.stringify({ b: body.branch, c: body.category, p: body.party, t: body.taxAmt, d: body.tdsAmt, x: body.tcsAmt, tot: body.total, st: body.subtotal, l: body.lines, br: body.bankRef, pm: body.paymentMode }) : 'none';
  return useQuery({
    queryKey: ['accounting', 'preview-voucher', key],
    queryFn: () => apiPost('/api/accounting/preview-voucher', body),
    enabled: enabled() && !!(body && body.category),
    staleTime: 5_000,
  });
}

// Create a new voucher (Receipt / Payment / Contra / Journal / Credit Note /
// Debit Note / Purchase Expense). The backend posts a balanced double-entry,
// so we invalidate every accounting report + register so the new voucher shows
// in the Trial Balance, P&L, Balance Sheet, Day Book and ageing immediately.
export function useCreateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    // VNO is ALWAYS auto-assigned server-side (atomic per branch×type → no duplicates).
    // Never trust a client-built number — blank it so accounting.create() mints it.
    mutationFn: (body) => apiPost('/api/vouchers', { ...body, vno: '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
  });
}


// Save an edited voucher; re-posts the journal server-side. Invalidates the
// reports/registers so the change shows everywhere immediately.
export function useUpdateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => apiPut(`/api/vouchers/${id}`, body),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['accounting'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['voucher', id] });
    },
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
