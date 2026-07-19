/* ════════════════════════════════════════════════════════════════════
   MODULES/DEV-CONTROL/REGISTRY.JS — the developer wiring registry
   ════════════════════════════════════════════════════════════════════
   HAND-MAINTAINED source of truth for "what state is every part of this
   ERP actually in" — wired, partial, stub, dormant, pending, or unverified.
   Rendered by the Super-Admin-only Developer Control page (/dev/control).

   UPDATE THIS FILE whenever a feature's real status changes — it is the
   only place this knowledge is recorded in-product. Statuses:

     live     — wired end-to-end (UI ↔ API ↔ DB), verified working
     partial  — works, but with known gaps listed in `note`
     stub     — screen exists but is UI-only / demo / seed-data (no backend)
     dormant  — fully built but intentionally switched OFF (flag/config)
     pending  — designed / planned, not built yet
     audit    — status unverified; needs a developer to confirm wiring

   `modules: [...]` keys each item onto the backend 75-module tree
   (tk-group/moduleRegistry.js ids) so the Control Tower's Setup-Readiness
   module map can say per module "needs development" with this item's
   `remark` as the fix narration. [] = platform-wide, not tied to one module.
   ──────────────────────────────────────────────────────────────────── */

/* Tracked-status meta for the work tracker (mirrors the Control Tower's
   finding-status workflow, plus terminal states). Persisted per item in the
   backend (/api/dev-control), keyed by the item's stable `id`. */
export const TRACK_META = {
  'open':        { label: 'Open',        color: '#cf222e', bg: '#ffebe9' },
  'acknowledged':{ label: 'Acknowledged',color: '#9a6700', bg: '#fff8e1' },
  'in-progress': { label: 'In progress', color: '#0969da', bg: '#e7f1ff' },
  'done':        { label: 'Done',        color: '#1a7f37', bg: '#e6f4ea' },
  'wont-do':     { label: "Won't do",    color: '#57606a', bg: '#f0f2f5' },
};

/* Board ordering: what most blocks "ERP complete end to end" first. */
export const SEVERITY_ORDER = { pending: 0, partial: 1, stub: 2, audit: 3, dormant: 4, live: 5 };

export const STATUS_META = {
  live:    { label: 'Live',        color: '#1a7f37', bg: '#e6f4ea', desc: 'Wired end-to-end and verified' },
  partial: { label: 'Partial',     color: '#9a6700', bg: '#fff8e1', desc: 'Working with known gaps' },
  stub:    { label: 'Stub / Demo', color: '#8250df', bg: '#f3ecff', desc: 'UI only — static or seed data, no real backend' },
  dormant: { label: 'Dormant',     color: '#0969da', bg: '#e7f1ff', desc: 'Built but intentionally disabled (flag / config)' },
  pending: { label: 'Pending',     color: '#cf222e', bg: '#ffebe9', desc: 'Planned / designed, not built yet' },
  audit:   { label: 'Needs Audit', color: '#57606a', bg: '#f0f2f5', desc: 'Unverified — a developer must confirm wiring' },
};

export const DEV_REGISTRY = [
  {
    area: 'Accounting Core (Double-Entry Engine)',
    items: [
      { name: '28-group Tally double-entry engine', status: 'live', modules: ['accounting'], api: ['/api/accounting'], note: 'posting.builder + universal pending gate. Every posted voucher writes balanced DR/CR journals.' },
      { name: 'Trial Balance (Opening/Debit/Credit/Closing)', status: 'live', modules: ['accounting'], routes: ['/finance/trial-balance', '/trial-balance'], api: ['/api/accounting'], note: 'Backend restart required after trialBalance controller changes.' },
      { name: 'Day Book / Cash Book / Ledger A/c (live)', status: 'live', modules: ['accounting'], routes: ['/day-book', '/finance/cash-book', '/ledger'], note: 'From–To defaults today; views + search + pagination + export. Legacy CashBookReport in finance.jsx is DEAD code.' },
      { name: 'P&L + Balance Sheet (unified, Tally, Schedule III)', status: 'live', modules: ['accounting'], routes: ['/reports/pnl', '/reports/bs', '/reports/pnl-tally', '/reports/bs-tally', '/reports/schedule3-bs'], note: 'Audited: TB/BS balance, A=L+E, BS "P&L A/c" ties to Tally P&L exactly (modulePL excludes only Sales/Purchase Accounts from indirect).' },
      { name: 'P&L period system (YTD default, matrix, compare)', status: 'live', modules: ['accounting'], routes: ['/reports/pnl'], note: 'Indirect expenses split Fixed/Variable via Group.expenseType — classify with `npm run seed:expense-types`, then restart backend.' },
      { name: 'Notes to Financial Statements', status: 'live', modules: ['accounting'], routes: ['/reports/fs-notes'], note: 'Frontend-computed from BS/P&L/TB/ageing (notesEngine.js) — reconciles by construction.' },
      { name: 'Groups / Ledgers masters (DB-backed CoA)', status: 'live', modules: ['groups', 'ledgers'], routes: ['/masters/groups', '/masters/ledgers', '/masters/accounts-tree'], api: ['/api/groups', '/api/subgroups', '/api/ledgers'], note: '28 Tally groups seeded + locked; custom groups/sub-groups editable. OPEN ITEM: Sales/Purchase ledgers are still edit-only in places.' },
      { name: 'Branch chart replication (shared-chart model)', status: 'live', modules: ['ledgers', 'branches'], api: ['/api/ledgers'], note: 'VERIFIED ON PROD 2026-07-10: all 6 branches (BOMMB/BOM/AMD/NBO/DAR/FBM) carry an identical 436-ledger chart in branch currency (GST vs VAT+WHT). TKHO was RENAMED to BOMMB — zero TKHO remnants remain (no branch doc, no ledgers), so the old "TKHO stale" note is obsolete.' },
      { name: 'Dynamic CoA — infinite nesting + recursive rollup', status: 'live', modules: ['groups', 'ledgers'], api: ['/api/subgroups', '/api/groups'], note: 'ALL PHASES COMPLETE 2026-07-10 (docs/dynamic-chart-of-accounts.md): Phases 1-2 were already live (hierarchy fields, recursive resolveGroup, tree API + rollup — consumed by the BS/P&L drill trees); Phase 3-6 built today: POST /api/subgroups/:id/move (cycle guard, subtree re-stamp + rebuildHierarchy, names never change so postings stay valid) + /:id/clone (zero-opening ledgers, fresh codes) + bulk-import/export; Trial Balance ?view=grouped (subtotals ARE sums of the flat rows — ties by construction); Accounts Tree Move to…/Clone… for custom nodes (system stay locked); admin-role RBAC on all new verbs. Restart backend.' },
      { name: 'Module cost centres / module-wise GP', status: 'live', modules: ['cost-centers'], api: ['/api/module-pl', '/api/cost-centers'], note: 'VERIFIED ON PROD 2026-07-10: every entry path stamps voucher.costCenter (booking orders + per-leg, data-import via importLeafCode + explicit column, CRM read-bridge from service_type, INB leaves), POST /api/accounting/backfill-cost-centers exists (admin-only), and the approval gate blocks untagged Flights/Holiday vouchers. Live check: 0 of 1362 product vouchers resolve to an Unspecified bucket.' },
    ],
  },
  {
    area: 'Vouchers & Transactions',
    items: [
      { name: '7 finance vouchers (Receipt/Payment/Contra/Journal/PXP/Debit Note/…)', status: 'live', modules: ['vouchers'], routes: ['/receipts', '/payments', '/contra', '/journal', '/purchase-expense', '/debit-note'], api: ['/api/vouchers'], note: 'Rebuilt to Travkings HTML spec. Receipt/Payment have bill-wise allocation + On-Account via GET /api/vouchers/open-bills. Debit Note = supplier purchase-return.' },
      { name: 'SO/PO/GP booking (one screen → linked locked Sale+Purchase)', status: 'live', modules: ['booking-orders'], routes: ['/bookings/new'], api: ['/api/booking-orders'], note: 'Approve spawns locked vouchers via internal source:"booking" (unspoofable). GP math includes incentive. bookingTotals GST parity is the hard gate.' },
      { name: 'Inter-Branch (INB) vouchers + Link registry', status: 'live', modules: ['inter-branch-voucher'], routes: ['/bookings/inter-branch', '/accounts/inb-register', '/accounts/inb-matrix', '/accounts/inb-counterparty'], api: ['/api/inter-branch'], note: 'Seller-side locked legs, Approve posts/Push hands to buyer + auto-seeds buyer booking. POST /api/inter-branch is CRM-ready; FIXED 2026-07-08: caller-supplied externalRef dedupe (repeat push returns the existing deal; partial unique index backstop → 409).' },
      { name: 'Refund / Reissue (RF/RI against a sales invoice)', status: 'live', modules: ['vouchers'], routes: ['/finance/refund', '/finance/reissue', '/finance/refund-partial'], note: 'SO/PO/GP reversal modules; balanced DR/CR + counterParty/supplierAmt second leg. Standalone RefundVoucher/ReissueVoucher screens are retired.' },
      { name: 'TCS / TDS auto-posting to own ledgers', status: 'live', modules: ['vouchers'], note: 'TCS: sale→Payable, purchase→Receivable. TDS is Journal-only EXCEPT on supplier incentive. Seed via `npm run seed:tax-ledgers`.' },
      { name: 'Supplier incentive / commission income', status: 'live', modules: ['vouchers'], note: 'Auto GST(output) + TDS on the incentive base only; flows to invoice/module GP, P&L, BS. Backfill: `npm run backfill:incentives`.' },
      { name: '3-level approval chain (Check → Verify → Approve)', status: 'live', modules: ['vouchers', 'approval-rules'], routes: ['/transactions/voucher-approvals'], note: 'POLICY DECIDED 2026-07-10: CRM-pushed entries always walk Check→Verify→Approve; ERP-entered/legacy keep single-step Approve (large backlogs must not chain). Extending the chain to branch ERP entries is BUILT and dormant behind Owner flag approval.chain_branch_entries (stamps reviewChain at create); Director/Owner escalation sign-offs likewise dormant behind approval.escalation_signoffs. Assignees in app-config; Super-Admin override exists.' },
      { name: 'Bill-wise settlement + overpaid visibility', status: 'live', modules: ['vouchers'], note: 'useOpenBills defaults includeOverpaid — over-settled bills render as orange non-allocatable credit rows everywhere, never netted into dues.' },
      { name: 'ADM/ACM memos (BSP debit/credit) → gated voucher', status: 'live', modules: ['adm-memos'], routes: ['/purchase/adm', '/purchase/acm', '/finance/adm-voucher', '/finance/acm-voucher'], api: ['/api/adm-memos'] },
      { name: 'Recurring vouchers / Print-preview & Comments', status: 'live', modules: ['vouchers'], routes: ['/accounting/recurring', '/finance/print-preview'], api: ['/api/recurring-vouchers', '/api/vouchers'], note: 'BUILT FOR REAL 2026-07-10. Recurring: /api/recurring-vouchers templates + daily cron (RECURRING_CRON, default 02:15) — every occurrence is a PENDING voucher on the JV/RV/PMT series (approver signs off; scheduler can never write books alone). Comments: persisted append-only thread on the voucher (GET/POST /api/vouchers/:id/comments). Print-preview: formal print layout of any REAL voucher by number (PENDING banner; posting stays in Approvals). MULTI-CURRENCY VOUCHER REMOVED 2026-07-16: it converted at a forex rate and posted a JV — forex reaching the books, which the group does not do (independent branches, each booking in its OWN currency, never converted or revalued). Forex rates are local-print only.' },
    ],
  },
  {
    area: 'CRM ↔ ERP Integration',
    items: [
      { name: 'CRM → ERP voucher push (SALE per TaxInvoice + PURCHASE per Supplier)', status: 'dormant', modules: ['crm'], remark: 'Intentional — no dev work pending. When the booking bridge ships, either delete the voucherPush machinery or deliberately re-enable PUSH_ENABLED.', note: 'HARD OFF since 2026-07: booksClient.js PUSH_ENABLED=false. Machinery (CRI/LK numbering, voucherPush) intact but dormant — bookings entered directly in ERP instead.' },
      { name: 'CRM ledger-create sync', status: 'live', modules: ['crm', 'ledgers'], note: 'IMPLEMENTED 2026-07-10: CRM B2C reference-ledger creation (manual + Meta system ledgers) now POSTs /api/ledgers on the ERP with the shared-JWT service token (Sundry Debtors ▸ B2C Reference / B2C Meta, idempotent adopt-on-duplicate; kbiz_ledger_id/kbiz_sync_status track it). Deliberately via the ERP API, never direct DB insert — the ERP ledgerCache syncs on in-process mongoose hooks. One-time backfill of 4 pre-existing pending ledgers still to run.' },
      { name: 'CRM → ERP booking bridge (Book Offline / Book Interbranch at confirmation)', status: 'live', modules: ['crm', 'booking-orders', 'inter-branch-voucher'], note: 'VERIFIED IMPLEMENTED 2026-07-10: CRM erp-booking module (Book Offline SO/PO/GP + Book Interbranch INB) pushes at confirmation as Pending; re-sync while pending (editReason), locked after ERP approval; INB dedupes on externalRef crm-query:<id>; Save Draft is CRM-only; push is HOD-gated (erp_booking:push — employees draft, HOD pushes); createdBy crm:* walks the ERP 3-level chain. Bridge deep-test 2026-07-09: 56/57 e2e green, deployed.' },
      { name: 'Payment Verification inbox (CRM payments → finance verify/reject)', status: 'live', modules: ['crm'], routes: ['/accounts/payment-verification'], note: 'Drives the CRM\'s own endpoints via shared-JWT SSO.' },
      { name: 'ERP ledger reads from CRM (erp-ledgers)', status: 'live', modules: ['crm'], note: 'CRM reads ERP chart via shared DB — still live even with push disabled.' },
      { name: 'Cross-app user access + per-app session floors', status: 'live', modules: ['user-access'], routes: ['/settings/users'], api: ['/api/user-access'], note: 'access.{crm,erp,app} on shared users; PER-APP single-device floors (crmLoginAt/erpLoginAt) since 2026-07-03; passwordChangedAt stays global.' },
      { name: 'CRM read-only bridge (sales-tickets + purchases)', status: 'live', modules: ['crm', 'tickets', 'purchases'], api: ['/api/crm'] },
    ],
  },
  {
    area: 'Reports & Analytics',
    items: [
      { name: 'Profitability reports (GP, yield, LTV, ABC, YoY)', status: 'live', modules: ['accounting'], routes: ['/reports/gp', '/reports/yield-destination', '/reports/customer-ltv', '/reports/abc-analysis', '/reports/yoy'], api: ['/api/accounting'], note: 'All pull live gp-bills via useGpBills. TRAP: static seed arrays in core/data.js (GP_BILLS, PKG_D, …) are [] — any screen still reading them renders blank.' },
      { name: 'Sales & GP Analytics + Inter-Branch reports', status: 'live', modules: ['accounting'], routes: ['/reports/sales-gp-analytics'], note: '5 sales segments derived by REGEX on voucher.partyGroup (no segment field). Cost paired by linkNo. Reconciles with Invoice-GP / P&L.' },
      { name: 'Financial statement suite (CF, MIS, Consolidated, Ratio, Branch)', status: 'live', modules: ['accounting'], routes: ['/reports/cf', '/reports/mis', '/reports/consolidated-bs', '/reports/ratios', '/reports/branch'], note: 'From live double-entry. seed.js fabricates a ₹3.35Cr BS — `npm run cleanup:demo` removes demo data (dry-run first, never drops db).' },
      { name: 'ReportDateBar / PeriodBar standard filter', status: 'live', modules: [], note: 'Monthly/Quarterly/YTD/All + back-dated From/To + YoY. Default "all". There is NO useDateRange symbol in this app — don\'t import it.' },
      { name: 'Report tools (Custom Builder, Saved Views, Scheduled Email)', status: 'live', modules: ['accounting'], routes: ['/reports/builder', '/reports/saved-views', '/reports/scheduled'], api: ['/api/report-views', '/api/report-schedules'], note: 'BUILT 2026-07-10: Builder = real query engine (POST /api/report-views/run over vouchers/journals/gp-bills; date range required ≤366d, 5000-row cap with truncated flag, branch-scope re-confined server-side) with totals + CSV + Save-as-view. Saved Views = /api/report-views CRUD (owner-stamped, share toggle, open preloads the builder). Scheduled = /api/report-schedules + hourly cron (REPORT_SCHEDULES_CRON) mailing HTML tables via the digest SMTP config; dormant sends record lastStatus smtp-not-configured honestly; rolling 30-day window for date-less views. Restart backend.' },
      { name: 'Legacy reports in finance.jsx / 6 deleted dead reports', status: 'live', modules: ['accounting'], note: 'RESOLVED 2026-07-10: dead legacy components (DayBook, LedgerAc, TrialBalanceLegacy, AdvanceDepositLedger, CashBookReport) deleted from finance/legacy.jsx + App.jsx imports cleaned; 1500 tests green. Live replacements are in modules/accountingLive.' },
    ],
  },
  {
    area: 'Dashboards',
    items: [
      { name: 'Dashboard KPIs (module-pl + ageing)', status: 'live', modules: [], routes: ['/dashboard'], api: ['/api/module-pl'], note: 'Defaults range:"all" scope:"ALL"; FY-aligned "quarter" added. Voucher/journal dates MUST be ISO or every period filter returns 0 (`npm run normalize:dates`).' },
      { name: 'FY targets / heatmap / alerts / bank-cash widgets', status: 'live', modules: ['sales-targets'], routes: ['/dashboard'], note: 'VERIFIED 2026-07-08 (registry was stale): FY targets render liveTargets; heatmap via GET /api/accounting/branch-heatmap; Approvals tile is a LIVE pending count (useVoucherApprovals / pending-bookings), no longer hardcoded 0; bank/cash intentionally lives on the Owner Dashboard.' },
      { name: 'Owner Dashboard + AD Cockpit', status: 'live', modules: [], routes: ['/dashboard/owner', '/dashboard/cockpit'], note: 'Email-gated: Super Admin + afshin.dhanani@kingsgroupco.com only (isOwnerDashboardUser).' },
      { name: 'Director dashboards suite (18 boards)', status: 'live', modules: ['sales-targets', 'budgets'], routes: ['/dashboards/exec', '/dashboards/profitability', '/dashboards/cash', '/finance/targets'], api: ['/api/sales-targets'], note: 'VERIFIED 2026-07-10: the targets-entry workflow the remark asked for ALREADY EXISTS — TargetsMaster at /finance/targets saves whole-FY targets per branch/metric (sales/GP/collections/NP) and module to /api/sales-targets; the "vs Target" boards pro-rate them. Boards read live accounting. Keeping targets data current is an operations task, not dev work.' },
      { name: 'Alerts dashboard + alert states', status: 'live', modules: ['alerts', 'alert-states'], routes: ['/dashboard/alerts'], api: ['/api/alerts', '/api/alert-states'] },
    ],
  },
  {
    area: 'Taxation',
    items: [
      { name: 'Per-branch tax regime (GST India / VAT+WHT Africa)', status: 'live', modules: ['branches', 'hsn-codes'], note: 'taxRegime on branch drives menus (TAX_INDIA/TAX_AFRICA/TAX_ALL) and posting. India: BOMMB/BOM/AMD. Africa: NBO/DAR/FBM.' },
      { name: 'GST screens on live GP bills (GSTR-1/3B views)', status: 'live', modules: ['tax-reconciliation'], routes: ['/tax/gstr1', '/tax/gstr3b'], note: 'Wired to live useGpBills (previously read empty GP_BILLS seed).' },
      { name: 'GSTR-2B import + ITC matching', status: 'live', modules: ['gstr2b'], routes: ['/tax/gstr2b-itc'], api: ['/api/gstr2b'], note: 'Control Tower gates on unmatched input credit.' },
      { name: 'Tax reconciliation (3B/VAT vs books, 1 vs 3B, TDS vs 26AS)', status: 'live', modules: ['tax-reconciliation'], routes: ['/tax/reconciliation'], api: ['/api/tax-reconciliation'] },
      { name: 'E-Invoice / E-Way Bill / GSP-IRP integration', status: 'dormant', modules: ['app-config', 'tax-reconciliation'], remark: 'Built to the provider boundary (2026-07-10) — switch ON by signing a GSP/IRP provider contract and entering credentials at /settings/gsp-irp, then wiring the provider client. Deliberately dormant until then; no other dev work pending.', routes: ['/tax/einvoice', '/tax/eway', '/settings/gsp-irp'], note: 'BUILT TO BOUNDARY 2026-07-10: both registers live from gp-bills (E-Way ≥₹50k), IRN/EWB columns read "awaiting GSP provider", Generate buttons disabled pointing at Settings ▸ GSP-IRP; credentials persist (app-config integration.gsp, secrets masked after save). Actual IRN/EWB filing is blocked on the external provider contract, not code.' },
      { name: 'GSTR-9C / Tax Audit 3CD / Form 26AS / Form 16A', status: 'live', modules: ['tax-reconciliation'], routes: ['/tax/gstr9c', '/tax/audit-3cd', '/tax/form26as', '/tax/form-16a'], note: 'BUILT 2026-07-10, frontend-computed from live books (Notes-to-Financials precedent, taxLive.js hooks): GSTR-9C reconciles P&L turnover vs gp-bills GSTR base + tax-summary vs filed (non-derivable rows are explicit manual inputs, persisted per branch×FY); 3CD computes derivable clauses (ratios, 34(a) TDS by section from live TDS ledgers) and honestly labels non-derivable ones with the reason; 26AS = TDS-receivable register by deductor×section (TRACES column blank-by-design); 16A = per-vendor certificates from TDS Payable accruals with real print. All sample arrays/banners on these four removed.' },
    ],
  },
  {
    area: 'Reconciliation & Period Close',
    items: [
      { name: 'Bank / Supplier / Client reconciliation (statement import + match)', status: 'live', modules: ['bank-reconciliation', 'supplier-reconciliation', 'client-reconciliation'], routes: ['/bank-reco', '/accounts/supplier-reco', '/accounts/client-reco'], api: ['/api/bank-reconciliation', '/api/supplier-reconciliation', '/api/client-reconciliation'] },
      { name: 'Inter-branch + Tally reconciliation', status: 'live', modules: ['interbranch-reconciliation', 'tally-reconciliation'], routes: ['/accounts/interbranch-reco', '/accounts/tally-reco'], api: ['/api/interbranch-reconciliation', '/api/tally-reconciliation'] },
      { name: 'Recon status tracker (per-month manual sign-off)', status: 'live', modules: ['recon-status'], routes: ['/finance/recon-status'], api: ['/api/recon-status'], note: 'Control Tower gates on it.' },
      { name: 'PDC register + bounce workflow', status: 'live', modules: ['pdc-register'], api: ['/api/pdc'] },
      { name: 'Month-end checklist / Suspense clearing / Year-end close', status: 'live', modules: ['fiscal-years', 'recon-status'], routes: ['/accounts/month-end', '/accounts/suspense', '/accounting/year-close'], api: ['/api/year-close'], note: 'Year-End Close BUILT 2026-07-10: /api/year-close/:v (gates: TB ties + BS balances + no pending FY vouchers; per-branch result snapshot in FiscalYearClose; hard PeriodLocks on all 12 FY months; super-admin reopen) + live screen replacing the demo wizard. DESIGN: no P&L→Retained-Earnings JV is posted — the BS "P&L A/c" plug derives retained earnings continuously, so the close verifies/records/locks instead (note on the screen + in yearEndClose.model.js). Month-end + suspense were already live. Restart backend to mount.' },
      { name: 'Intercompany billing', status: 'live', modules: ['interbranch-reconciliation'], routes: ['/accounting/intercompany'], api: [], note: 'Intercompany: retired the NotWired screen — /accounting/intercompany now opens the live INB register. FX REVALUATION REMOVED 2026-07-16: the group runs independent branches, each keeping books in its OWN currency and settling inter-branch at a fixed internal rate, so foreign balances are never revalued and no FX gain/loss can arise. Forex rates survive ONLY as the local secondary PRINT currency (USD→KES/TZS on an NBO/DAR invoice) — never for accounting.' },
    ],
  },
  {
    area: 'Masters & Data Import',
    items: [
      { name: 'Live masters suite (Voucher Types, Cost Categories, Budgets, Scenarios, Customers, Suppliers, Credit Facilities)', status: 'live', modules: ['voucher-types', 'cost-categories', 'budgets', 'scenarios', 'customers', 'suppliers', 'credit-facilities'], routes: ['/masters/voucher-types', '/masters/customers', '/masters/suppliers', '/masters/credit-facilities'], api: ['/api/voucher-types', '/api/cost-categories', '/api/budgets', '/api/scenarios', '/api/credit-facilities'] },
      { name: 'Cost Centres (seeded, Super-Admin writes)', status: 'live', modules: ['cost-centers'], routes: ['/masters/cost-centers'], api: ['/api/cost-centers'], note: 'Branch Accountant writes 403 (view allowed).' },
      { name: 'Data Import (vouchers, accounts, masters)', status: 'live', modules: ['import'], routes: ['/import'], api: ['/api/import'], note: 'Coerces date→ISO + branch→UPPERCASE (shared/utils/dates.js). Parties UPSERT chart ledgers. Non-ISO legacy rows: `npm run normalize:dates`.' },
      { name: 'Branch reference data', status: 'live', modules: ['branches'], api: ['/api/branches'], note: 'VERIFIED ON PROD 2026-07-10: all 6 branch docs are complete (city/country/currency/currencies/tax) and match seed-branches.js exactly — no code-only docs remain. For future fixes use idempotent `npm run seed:branches` — NEVER `seed` (drops the shared db) or `migrate:reference` (resets numbering).' },
      { name: 'Travel inventory masters (Airlines, Hotels, Seats, Tour Codes, Markup)', status: 'live', modules: ['tour-codes'], routes: ['/masters/airlines', '/masters/hotels', '/masters/seats', '/masters/tour-codes', '/masters/markup'], api: ['/api/airlines', '/api/hotels', '/api/seat-blocks', '/api/markup-rules', '/api/tour-codes'], note: 'BUILT 2026-07-10: four new backend masters (buildCrudRouter, tour-codes pattern) + all four screens live with create/edit/persist. Markup rules now have a CONSUMER: SO/PO/GP entry prefills the markup from the matching active Percentage rule (exact module beats ALL; user override always wins) and warns below the GP floor. Restart backend to mount.' },
      { name: 'Numbering series / Forex rates / Bank accounts', status: 'live', modules: ['numbering-series', 'forex-rates'], routes: ['/masters/numbering', '/masters/forex', '/masters/bank-accounts'], api: ['/api/numbering-series', '/api/forex-rates'] },
      { name: 'Vendor Credit Terms screen', status: 'live', modules: ['suppliers'], routes: ['/masters/vendor-terms'], note: 'WIRED 2026-07-11: now a live bulk credit-terms grid over the SUPPLIER MASTER — one row per supplier, inline-editable creditDays/creditLimit/settlementCycle/paymentMethod saved via PUT /api/suppliers/:id (single source of truth; the Task List, ageing and payment screens read the same fields). Field-access 403s surface as toasts. Bill-wise dues stay in Payables Ageing, not here.' },
      { name: 'Bank-ledger detail backfill (bankName / bankAcNo / bankIfsc)', status: 'live', modules: ['ledgers'], routes: ['/masters/bank-accounts'], note: 'SCRIPT BUILT 2026-07-10: `npm run backfill:bank-details` (dry-run default, --apply writes; idempotent — fills only EMPTY fields, never touches names/groups/balances). Dry run parses 42/42 heads (incl. card heads — last-4 is deliberately NOT stored as an account number). ONE STEP LEFT: run with --apply, then collect the branches\' IFSC list into IFSC_BY_ACCOUNT (or via Masters ▸ Bank Accounts) and re-run.' },
      { name: 'Statutory Filing Register + Vacation Delegations screens', status: 'live', modules: ['tax-calendar', 'user-access'], routes: ['/settings/filing-register', '/settings/delegations'], api: ['/api/tax-calendar', '/api/delegations'], note: 'WIRED 2026-07-11: Filing Register reads /api/tax-calendar (status DERIVED from filedDate vs due date; "Mark Filed" persists filedDate/filedBy/ack — model extended additively). Delegations persist via new /api/delegations master (create, End-now, derived Active/Scheduled/Completed) — explicitly labelled an INFORMATIONAL register: approvals are not auto re-routed to the delegate yet (separate product decision). Static demo constants removed. Restart backend.' },
      { name: 'TK daily digest email (SMTP)', status: 'dormant', modules: ['digest'], remark: 'Set SMTP_HOST (+ credentials) in the backend env to enable — the scheduler logs "SMTP not configured — daily digest dormant" on every boot. Server env config, not a screen task.', note: 'Digest cron is built and boots with the server; it only needs mail transport to go live.' },
    ],
  },
  {
    area: 'TK Group (Central Governance)',
    items: [
      { name: 'TK Group control layer (flags, change-requests, inbox, decisions, limits, period locks)', status: 'dormant', modules: ['tk-group'], remark: 'Intentional (dormant-safe by design) — no dev work pending. Switch the core.policy_guard flag ON at go-live.', routes: ['/tk/control-panel', '/tk/controls', '/tk/approvals', '/tk/decisions'], api: ['/api/tk/flags', '/api/tk/change-requests', '/api/tk/inbox', '/api/tk/decisions', '/api/tk/limits', '/api/tk/period-locks'], note: 'REAL backend, dormant-safe by design: every page shows empty/read-only until core.policy_guard flag is switched on at go-live.' },
      { name: 'Control Tower / Branch Cockpit / monitoring rules', status: 'live', modules: ['tk-group'], routes: ['/tk/control-tower', '/tk/branch-cockpit', '/tk/rules'], api: ['/api/tk/monitor', '/api/tk/rules', '/api/tk/finding-status'], note: 'Rules Manager is OWNER-only.' },
    ],
  },
  {
    area: 'HR & Payroll',
    items: [
      { name: 'Employee master / attendance / shifts / leave', status: 'live', modules: ['employees', 'attendance'], routes: ['/hr/employees', '/hr/attendance', '/hr/shifts', '/hr/leave'], api: ['/api/employees', '/api/attendance', '/api/shifts', '/api/leave-requests', '/api/leave-balances'], note: 'VERIFIED 2026-07-08: all four persist — useMasterList/useMasterMutations + apiPut (/api/attendance/mark|time|mark-days).' },
      { name: 'Payroll runs / payslips / salary revision / employee loans', status: 'live', modules: ['hr'], routes: ['/hr/payroll', '/hr/payslips', '/hr/salary-revision', '/hr/loans-advances'], api: ['/api/payroll-runs', '/api/salary-revisions', '/api/employee-loans'], note: 'PAYROLL ENGINE BUILT 2026-07-10: server-side compute + PERSISTED per-employee PayrollLine register (unique per run×employee; payslip = the stored line), statutory rates config-driven via app-config payrollStatutoryRates (PF 12/12 + EPS, ESI 0.75/3.25 @₹21k ceiling, MH PT slabs, TDS slabs — defaults lifted verbatim from the old FE hardcodes; parity proven by payrollEngine.test.js). POST /api/payroll-runs/process is idempotent per run. FE is now a renderer. Restart backend.' },
      { name: 'Recruitment / gratuity / PF-ESI challan', status: 'live', modules: ['hr'], routes: ['/hr/recruitment', '/hr/gratuity', '/hr/pf-esi'], api: ['/api/job-openings', '/api/payroll-runs'], note: 'DONE 2026-07-10: PF/ESI/PT challans persist (ChallanPayment, unique per month×branch×type, BSR/TRN/date/status via PUT /api/payroll-runs/challans; Mark Paid hydrates from the saved record); challan figures come from the persisted payroll register. Gratuity explicitly labelled "view-only actuarial estimate — NOT posted to the books". Recruitment was already live.' },
      { name: 'Self-service (portal, leave apply, reimbursement, my payslip, Form 16, 360°, skills)', status: 'live', modules: ['hr', 'employees'], routes: ['/hr/portal', '/hr/leave-apply', '/hr/my-payslip', '/hr/form-16'], note: 'SCOPED 2026-07-10: every screen resolves the LOGGED-IN user (kb360-user email → employee record, case-insensitive); no match → honest "login not linked to an employee profile" gate, never demo data. Leave-apply submits real Pending /api/leave-requests as the resolved employee; My Payslip reads the persisted payroll lines; Form 16 (MyForm16) sums my persisted register lines per FY with an explicit note on what Books cannot know (TRACES Part A). Portal stats are live and mine.' },
      { name: 'HR org masters — Departments, Designations, Grades', status: 'live', modules: ['hr', 'employees'], routes: ['/hr/employees'], api: ['/api/departments', '/api/designations', '/api/grades'], note: 'BUILT 2026-07-11: three masters (buildCrudRouter; grades carry min/max salary bands) + the live employee editor\'s department/designation/grade are now SELECTS fed by them — an employee\'s legacy free-text value renders as a "(current)" option so old rows never blank on save. Employee model/DTO carry grade. FM fills the masters from the Task List. Restart backend.' },
      { name: 'Public-holiday calendar master', status: 'live', modules: ['hr', 'attendance'], routes: ['/hr/attendance'], api: ['/api/holidays'], note: 'BUILT 2026-07-11: /api/holidays (unique per date×branch; branch \'ALL\' = group-wide) + 🎉 Holidays admin modal on the attendance register. Grid auto-marks H for matching holidays — a HAND-MARKED cell still wins so corrections stay possible — and bulk "Fill working days" skips holidays like weekly-offs. FM enters each branch\'s list yearly. Restart backend.' },
    ],
  },
  {
    area: 'Settings, Access & Platform',
    items: [
      { name: 'Users & Roles + App Access tab', status: 'live', modules: ['roles', 'user-access'], routes: ['/settings/users'], api: ['/api/user-access', '/api/roles'], note: 'Per-app login toggles enforced at each app\'s login + mid-session eviction; defaults true.' },
      { name: 'Page Visibility Control (per-user hidden/granted)', status: 'live', modules: ['user-access'], routes: ['/settings/page-access'], note: 'Email-gated admin (afshin + developer account). Catalogue auto-derived from menu trees + generated route manifest.' },
      { name: 'Branch scoping + full-scope roles + no-branch lockout', status: 'live', modules: ['auth', 'branches'], note: 'Full-scope roles expand ALL→live branches at login; user with no branch sees a notice, server also scopes every call.' },
      { name: 'Support tickets (in-app issue tracker)', status: 'live', modules: ['support-tickets'], routes: ['/support/tickets'], api: ['/api/support-tickets'] },
      { name: 'Audit log / export audit trail', status: 'live', modules: ['audit', 'export-audit'], routes: ['/settings/audit', '/reports/audit-trail'], api: ['/api/audit', '/api/export-audit'] },
      { name: 'Admin Power pages (doc/email templates, approval matrix, custom fields, field access, permissions matrix, branding, bulk users)', status: 'live', modules: ['email-templates', 'custom-fields', 'field-access', 'approval-limits'], routes: ['/settings/doc-templates', '/settings/email-templates', '/settings/approval-matrix-builder', '/settings/custom-fields', '/settings/field-access', '/settings/permissions-matrix', '/settings/branding', '/settings/bulk-users'], api: ['/api/email-templates', '/api/custom-fields', '/api/field-access', '/api/approval-limits'], note: 'CONSUMERS BUILT 2026-07-10: (1) email SEND pipeline — POST /api/email-templates/:id/send renders {tokens}/{{tokens}} and mails over the digest SMTP config (503 with reason when SMTP unset), Send modal on the editor; (2) custom fields now DRIVE the Customer/Supplier master forms (typed inputs + required badges bound into customFields[], free-form rows kept); (3) field-access ENFORCED — fieldAccessGuard middleware 403s writes to restricted fields (creditLimit/pan/banks/salary/costCenter) on customers/suppliers/vouchers/employees per role, fail-open when unconfigured; (4) Approval Matrix Builder saves live to /api/approval-limits (diff → POST/PUT/DELETE). Doc-templates/branding/permissions-matrix stay honestly preview-only (no backing store yet). Restart backend.' },
      { name: 'Banking API / GSP-IRP integration settings', status: 'dormant', modules: ['app-config'], remark: 'Built to the provider boundary (2026-07-10) — switch ON when bank-feed / GSP contracts exist: enter credentials, then wire the provider client. No other dev work pending.', routes: ['/settings/banking-api', '/settings/gsp-irp'], note: 'PERSISTED 2026-07-10: both forms save/load for real via app-config (integration.banking / integration.gsp; secrets masked after save, blank re-save keeps stored value). Test-connection/enable stay disabled with an "awaiting provider contract" state.' },
      { name: 'Period locking (settings)', status: 'live', modules: ['tk-group'], routes: ['/settings/period-lock'], note: 'FIXED 2026-07-08: the dead second lock UI (empty data, inert buttons) was retired — /settings/period-lock now renders the real TK period-lock admin (TkPeriodLockPage → /api/tk/period-locks, policyGuard). Same page as /tk/period-locks.' },
      { name: 'Developer Control Tower (this console)', status: 'live', modules: [], routes: ['/dev/control'], api: ['/api/dev-control'], note: 'Super-Admin-only. Findings board mirrors TK Control Tower finding-status; per-item owner/status/due/note persisted in DevItemStatus. Definitions hand-maintained in this registry file.' },
      { name: 'Automated code scan (live FE+BE issue detector)', status: 'live', modules: [], routes: ['/dev/control', '/tk/control-tower'], api: ['/api/dev-control/scan'], note: 'Auto-runs on every ERP refresh (Control Tower ▸ Development + Dev Control). Backend walks the FE+BE source trees on disk (codeScan.js) and flags broken imports, dead menu/registry routes, placeholder screens (<NotWired>/throw-not-implemented/"coming soon"), dead buttons/links, debugger + bare empty-catch + TODO/FIXME — each with a how-to-fix remark, worst-first. Comment-aware tokenizer keeps false positives near zero. FE findings also baked at build time (scripts/gen-dev-scan.cjs → core/devScan.generated.js) so prod, where the API box has no FE source, still gets FE coverage; the lens prefers live over build when the FE tree was reached. 60s server cache; "Re-scan now" forces a fresh walk.' },
    ],
  },
];

/* ── Stable ids ───────────────────────────────────────────────────────
   Every item gets a stable `id` (slug of area + name) used as the key for
   its tracking row in the backend (/api/dev-control) — the Control-Tower
   checkId equivalent. NOTE: renaming an item re-keys it and orphans its
   saved owner/status/due; to rename without losing tracking, set an
   explicit `id:` on the item first. */
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
DEV_REGISTRY.forEach((area) => area.items.forEach((item) => {
  if (!item.id) item.id = `${slug(area.area).split('-').slice(0, 2).join('-')}--${slug(item.name).slice(0, 60)}`;
  item.area = area.area;
}));

/* Flat list — the board works item-wise. */
export const ALL_ITEMS = DEV_REGISTRY.flatMap((a) => a.items);

/* ── Shared clearing rule ─────────────────────────────────────────────
   An item is CLEARED when its registry row says 'live', or when its tracking
   row (/api/dev-control) was closed as done / won't-do. This ONE rule feeds
   both /dev/control AND the TK Control Tower's Development lens — fixing an
   item in Dev Control clears it everywhere at once. */
export const isCleared = (item, tracked) =>
  item.status === 'live' || ['done', 'wont-do'].includes((tracked && tracked.status) || '');

/* Dormant = fully BUILT but intentionally switched off (flag/config) until
   go-live. That is a go-live switch, not developer work — so dormant items are
   NOT "pending from the developer". They render in their own "Dormant by
   design" section so they aren't forgotten at go-live. */
export const isDormant = (item) => item.status === 'dormant';

/* The one question the boards ask: does this item still need DEV work? */
export const isDevPending = (item, tracked) => !isCleared(item, tracked) && !isDormant(item);

/* ── Module verdicts — "which modules fully work, which don't" ────────
   working — every item cleared (wired live or closed)
   gaps    — open items are only partial / audit / dormant (usable, known gaps)
   broken  — at least one stub or pending item open (functionality missing) */
export const VERDICT_META = {
  broken:  { label: 'Not fully working', color: '#cf222e', bg: '#ffebe9', desc: 'Has stub / pending parts — functionality is missing' },
  gaps:    { label: 'Working with gaps', color: '#9a6700', bg: '#fff8e1', desc: 'Usable, but known gaps remain (partial / dormant / unverified)' },
  working: { label: 'Fully working',     color: '#1a7f37', bg: '#e6f4ea', desc: 'Everything wired live or intentionally closed' },
};
const VERDICT_ORDER = { broken: 0, gaps: 1, working: 2 };

/* Module-wise rollup for the module status table (Dev Control) and the
   Development lens (Control Tower). `trackMap` is itemId → tracking row. */
export function moduleRollup(trackMap = {}) {
  return DEV_REGISTRY.map((a) => {
    const open = a.items.filter((i) => isDevPending(i, trackMap[i.id]));
    const dormant = a.items.filter((i) => !isCleared(i, trackMap[i.id]) && isDormant(i));
    const verdict = open.some((i) => i.status === 'stub' || i.status === 'pending') ? 'broken' : open.length ? 'gaps' : 'working';
    return { area: a.area, total: a.items.length, cleared: a.items.length - open.length - dormant.length, open, dormant, verdict };
  }).sort((x, y) => (VERDICT_ORDER[x.verdict] - VERDICT_ORDER[y.verdict]) || (y.open.length - x.open.length));
}

/* ── Open dev findings by module — feeds the Setup-Readiness module map ──
   moduleId (backend tk-group/moduleRegistry.js) → the OPEN dev items mapped to
   it via each item's `modules`. Same clearing rule as everywhere (isDevPending),
   so fixing an item in Dev Control clears it off the module map too. Items
   with status 'dormant' are intentional (switched off at go-live), not a dev
   need — they are EXCLUDED here so the module map never says "needs
   development" for a deliberately-off feature. */
export function openDevByModule(trackMap = {}) {
  const by = {};
  ALL_ITEMS.forEach((item) => {
    if (!isDevPending(item, trackMap[item.id])) return;
    (item.modules || []).forEach((id) => { (by[id] = by[id] || []).push(item); });
  });
  return by;
}

/* ── Script runbook — every scripted operation and how dangerous it is ── */
export const RUNBOOK = [
  { cmd: 'npm run seed', danger: 'FATAL', note: 'DROPS the entire shared Atlas DB ("test" — CRM + ERP share it). Never run against prod. Fabricates a demo ₹3.35Cr BS.' },
  { cmd: 'npm run cleanup:demo', danger: 'safe', note: 'Removes demo data. Dry-run by default, never drops the db.' },
  { cmd: 'npm run seed:branches', danger: 'safe', note: 'Idempotent branch reference-data fix (names, currencies, TKHO). Use INSTEAD of seed / migrate:reference.' },
  { cmd: 'npm run migrate:reference', danger: 'RISKY', note: 'RESETS voucher numbering — do not use for branch fixes.' },
  { cmd: 'npm run normalize:dates', danger: 'safe', note: 'Coerces legacy voucher/journal dates to ISO (originals kept in dateRaw). Non-ISO dates make vouchers invisible to every bounded report.' },
  { cmd: 'npm run seed:tax-ledgers', danger: 'safe', note: 'Seeds TCS/TDS payable/receivable ledgers.' },
  { cmd: 'npm run seed:expense-types', danger: 'safe', note: 'Classifies indirect-expense groups Fixed/Variable for the P&L split. Restart backend after.' },
  { cmd: 'npm run seed:branch-charts', danger: 'RISKY', note: 'Clones BOM CoA skeleton to other branches in branch currency (chartReplicator.js). Review scope before running.' },
  { cmd: 'npm run backfill:incentives', danger: 'RISKY', note: 'Backfills supplier-incentive postings on existing vouchers.' },
];

/* ── Known issues / gotchas that bite developers ── */
export const KNOWN_ISSUES = [
  'Frontend .env points at the PROD EC2 API by default — local backend code 404s until deployed, or override with .env.local (VITE_KBIZ_API_BASE=http://localhost:9090).',
  'Backend changes to trialBalance / modulePL / expense-type classification need a backend restart (pm2 restart on EC2, re-run locally).',
  'core/data.js seed arrays (GP_BILLS, PKG_D, …) are intentionally EMPTY — a screen importing them instead of the live hooks renders blank with no error.',
  'Voucher/journal dates must be ISO — a non-ISO date makes the voucher invisible in ALL period-bounded reports and dashboards.',
  'Email-template / custom-field / field-access config now PERSISTS (2026-07-08) but is still consumed/enforced NOWHERE — wiring the consumers is the open build item.',
  'Year-End Close posts NOTHING — a live-looking screen with zero DB writes. (FX revaluation was REMOVED entirely: each branch is single-currency and an inter-branch deal freezes its rate, so no FX gain/loss can arise and there is nothing to revalue.)',
  'HR PF-ESI challan "Mark Paid" and payroll register PF/ESI/PT/TDS lines are client-side only — challan payment records and payslip lines are never persisted.',
  'Sales segments in Sales & GP Analytics are derived by regex on voucher.partyGroup — renaming party groups silently reclassifies history.',
  'Never raw status-flip a posted voucher — always unpostLeg (see the 2026-07-02 INB revert batch: un-post refund BEFORE its INB sale).',
  'TKHO was RENAMED to BOMMB — any doc/script still referring to a TKHO branch is stale (verified on prod 2026-07-10: no TKHO branch doc or ledgers exist).',
  'ERP and CRM share ONE MongoDB — destructive ERP scripts damage the CRM too.',
];

/* ── Live wiring checks — cheap GETs against every major API mount.
   2xx/4xx = mounted & reachable (4xx often just means "needs params/role");
   network error = backend or mount is down. ── */
export const HEALTH_CHECKS = [
  { label: 'API health', path: '/api/health' },
  { label: 'Auth (token refresh)', path: '/api/auth/refresh', method: 'POST' },
  { label: 'Branches', path: '/api/branches' },
  { label: 'Groups (CoA)', path: '/api/groups' },
  { label: 'Ledgers', path: '/api/ledgers' },
  { label: 'Vouchers', path: '/api/vouchers' },
  { label: 'Booking orders (SO/PO/GP)', path: '/api/booking-orders' },
  { label: 'Inter-branch (INB)', path: '/api/inter-branch' },
  { label: 'Accounting engine', path: '/api/accounting/trial-balance' },
  { label: 'Module P&L (cost centres)', path: '/api/module-pl' },
  { label: 'Cost centers', path: '/api/cost-centers' },
  { label: 'Recon status', path: '/api/recon-status' },
  { label: 'GSTR-2B', path: '/api/gstr2b' },
  { label: 'TK flags (governance)', path: '/api/tk/flags' },
  { label: 'TK monitor (Control Tower)', path: '/api/tk/monitor' },
  { label: 'Alerts', path: '/api/alerts' },
  { label: 'Support tickets', path: '/api/support-tickets' },
  { label: 'User access (cross-app)', path: '/api/user-access' },
  { label: 'App config', path: '/api/app-config' },
  { label: 'CRM bridge', path: '/api/crm' },
  { label: 'Numbering series', path: '/api/numbering-series' },
  { label: 'Import', path: '/api/import' },
  { label: 'Dev Control tracker', path: '/api/dev-control' },
  { label: 'Code scan (live FE+BE)', path: '/api/dev-control/scan' },
];
