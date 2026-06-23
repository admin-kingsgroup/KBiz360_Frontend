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
import { confirmDialog } from './ux/confirm';
import { apiGet, apiPut, apiPost, apiDelete, getAuthToken } from './api';

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

// Cost-centre (Domestic/International) split of a P&L ledger — the Tally sub-ledger
// level for Flights/Holidays. Returns an array [{ costCenter, label, amount, side }].
// `on` gates the fetch (only trading ledgers have a meaningful split).
export function useLedgerSplit(name, branch, { from, to } = {}, on = true) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'ledger-split', name || '', code || 'all', from || '', to || ''],
    queryFn: () => apiGet('/api/accounting/ledger-split/' + encodeURIComponent(name), { branch: code, from, to }),
    enabled: enabled() && !!name && on,
    staleTime: 30_000,
  });
}

// Fare/charge component breakdown (Base Fare, K3, Taxes…) of a P&L ledger, per
// cost-centre. Returns { rows:[{ component, label, amount, side }], side }.
export function useLedgerComponents(name, branch, { from, to, costCenter } = {}, on = true) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'ledger-components', name || '', code || 'all', from || '', to || '', costCenter || ''],
    queryFn: () => apiGet('/api/accounting/ledger-components/' + encodeURIComponent(name), { branch: code, from, to, ...(costCenter ? { costCenter } : {}) }),
    enabled: enabled() && !!name && on,
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
// `summary: true` asks the backend for the totals + per-module Sales/COGS/GP only,
// skipping the per-booking file drill (the part that scans every voucher). Use it
// wherever the consumer reads only `totals` / `bridge` / `indirect` / per-module
// amounts — i.e. dashboards — NOT where it reads `fileCount` / `files` / `subs`
// (the full Module-GP report). `withHeads: true` (only meaningful with summary) ALSO
// returns the per-module fare-component `heads` drill — computed server-side via an
// aggregation, so the P&L statement gets its ledger→component breakdown without the
// slow voucher scan. Cached separately per flag combination.
export function useModulePL(branch, { from, to, includeZero, summary, withHeads } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'module-pl', code || 'all', from || '', to || '', !!includeZero, !!summary, !!withHeads],
    queryFn: () => apiGet('/api/accounting/module-pl', { branch: code, from, to, ...(includeZero ? { includeZero: 1 } : {}), ...(summary ? { summary: 1 } : {}), ...(withHeads ? { withHeads: 1 } : {}) }),
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

// Branch-wise cost-centre catalogue (each branch carries its own copy of the
// standard set + any Super-Admin custom centres). GET /api/cost-centers?branch=…
// → { costCenters, modules }. Pass includeInactive to also load deactivated ones
// (the master screen), else only active centres are returned.
export function useCostCenters(branch, { includeInactive = false } = {}) {
  const params = new URLSearchParams();
  if (branch && branch !== 'ALL') params.set('branch', branch);
  if (includeInactive) params.set('includeInactive', 'true');
  const qs = params.toString();
  return useQuery({
    queryKey: ['cost-centers', branch || 'ALL', includeInactive],
    queryFn: () => apiGet(`/api/cost-centers${qs ? '?' + qs : ''}`),
    enabled: enabled(),
    staleTime: 60_000,
  });
}

// Super-Admin cost-centre management (custom add / edit / deactivate / delete).
export function useCreateCostCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiPost('/api/cost-centers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-centers'] }),
  });
}
export function useUpdateCostCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => apiPut(`/api/cost-centers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-centers'] }),
  });
}
export function useDeleteCostCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiDelete(`/api/cost-centers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-centers'] }),
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
    refetchInterval: 180_000, // keep the Alerts dashboard reasonably live
  });
}

// Set an alert's lifecycle status (Finish / Remind Later / re-open). Pass the
// alert's current signature+magnitude so the backend can later detect change /
// worsening. Invalidates the alerts feed so the dashboard reflects the move.
export function useSetAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiPut('/api/alert-states', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
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
  // Key on the FULL body. The old selective key omitted gstMode, counterParty, supplier
  // breakup (supplierAmt/Svc/Gst), gstPct and allocations — so toggling intra↔inter
  // (CGST/SGST↔IGST) or changing the counter-party while `total` stayed equal returned a
  // STALE cached journal that didn't match what the backend would post (approver signs off
  // on the wrong entry). Hashing the whole body guarantees the preview tracks every change.
  const key = body ? JSON.stringify(body) : 'none';
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
    // An edit reason is mandatory (saved to the audit trail). If the caller didn't
    // supply one, prompt for it here so EVERY voucher-edit path is covered centrally.
    mutationFn: async ({ id, body }) => {
      let editReason = body.editReason;
      if (!editReason || !String(editReason).trim()) {
        const { confirmed, reason } = await confirmDialog({ title: 'Save changes to this voucher?', message: 'Editing reverts it to Pending for re-approval.', reasonRequired: true, reasonLabel: 'Reason for editing (saved to the audit trail)', confirmLabel: 'Save changes' });
        if (!confirmed) throw new Error('Edit cancelled — a reason is required.');
        editReason = reason;
      }
      return apiPut(`/api/vouchers/${id}`, { ...body, editReason });
    },
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

// Refund (RF) + Reissue (RI) vouchers — each is ONE combined voucher that fully
// reverses its linked sale + cost. Folded into BOTH the Sales and Purchase Register
// "All modules" view so the registers show the complete customer/cost activity.
export function useRefundReissue(branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['vouchers', 'refund-reissue', code || 'all', from || '', to || ''],
    queryFn: () => Promise.all([
      apiGet('/api/vouchers', { branch: code, category: 'refund', from, to }),
      apiGet('/api/vouchers', { branch: code, category: 'reissue', from, to }),
    ]).then(([rf, ri]) => [...(rf || []), ...(ri || [])]),
    enabled: enabled(),
    staleTime: 30_000,
  });
}

// Approved SO/PO/GP bookings — used by the Sales/Purchase Register to join each
// posted invoice back to its booking for the per-passenger Pax / PNR / Ticket
// detail (booking-spawned voucher lines are aggregate heads, so the travel detail
// lives only on the booking's `rows`). Keyed by linkNo on the consumer side.
export function useBookingOrders(branch, { status } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['booking-orders', code || 'all', status || 'all'],
    // A status filter (e.g. 'pending') is applied server-side so a consumer that only
    // needs one bucket doesn't pull every booking's SO/PO/GP grid.
    queryFn: () => apiGet('/api/booking-orders', { branch: code, ...(status ? { status } : {}) }),
    enabled: enabled(),
    staleTime: 60_000,
  });
}

// Generic key/value config read — backed by /api/app-config/:key. A missing key
// (first use) 404s; we swallow it and return {} so callers get a clean empty state.
// Used by the Month-End checklist to persist its manual ticks per branch × month.
export function useConfigValue(key) {
  return useQuery({
    queryKey: ['app-config', key],
    queryFn: () => apiGet(`/api/app-config/${encodeURIComponent(key)}`).then((d) => (d && d.value) || {}).catch(() => ({})),
    enabled: enabled() && !!key,
    staleTime: 10_000,
  });
}
export function useSaveConfigValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value, description }) => apiPut(`/api/app-config/${encodeURIComponent(key)}`, { value, description }),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['app-config', vars.key] }),
  });
}
