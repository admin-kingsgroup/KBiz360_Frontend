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
      { name: 'Branch chart replication (shared-chart model)', status: 'partial', modules: ['ledgers', 'branches'], remark: 'Run `npm run seed:branches` then `npm run seed:branch-charts` scoped to TKHO; verify the TKHO chart under /masters/ledgers, then flip this row to live.', api: ['/api/ledgers'], note: 'BOM skeleton cloned to AMD/NBO/DAR/FBM/BOMMB in branch currency (GST vs VAT+WHT). TKHO is STALE. Re-run `npm run seed:branch-charts`; frontend Replicate modal was removed.' },
      { name: 'Dynamic CoA — infinite nesting + recursive rollup', status: 'pending', modules: ['groups', 'ledgers'], remark: 'Build per docs/dynamic-chart-of-accounts.md: parent pointers on Group, recursive rollup in accounting.service, migration for the existing 28-group tree, then the FE tree editor.', note: 'Approved plan: evolve the JS engine (not greenfield TS). Design doc: docs/dynamic-chart-of-accounts.md.' },
      { name: 'Module cost centres / module-wise GP', status: 'partial', modules: ['cost-centers'], remark: 'Stamp voucher.costCenter on EVERY entry path (booking importer, data-import, future CRM bridge), then POST /api/accounting/backfill-cost-centers for history. Done when Module P&L shows no "Unspecified" bucket.', api: ['/api/module-pl', '/api/cost-centers'], note: 'Seeded cost-centre driven. GAP: CRM push does not stamp voucher.costCenter (Flight / Holiday Intl-vs-Dom) → those land in "Unspecified".' },
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
      { name: '3-level approval chain (Check → Verify → Approve)', status: 'partial', modules: ['vouchers', 'approval-rules'], remark: 'Product decision needed: should ERP-entered vouchers also flow Check→Verify→Approve? If yes, drop the createdBy crm:* filter in chainApplies; if no, mark live and record the policy here.', routes: ['/transactions/voucher-approvals'], note: 'Applies to CRM-created entries ONLY (createdBy crm:*/crm-service). ERP-entered/legacy = old single-step Approve. Assignees in app-config; Super-Admin override exists.' },
      { name: 'Bill-wise settlement + overpaid visibility', status: 'live', modules: ['vouchers'], note: 'useOpenBills defaults includeOverpaid — over-settled bills render as orange non-allocatable credit rows everywhere, never netted into dues.' },
      { name: 'ADM/ACM memos (BSP debit/credit) → gated voucher', status: 'live', modules: ['adm-memos'], routes: ['/purchase/adm', '/purchase/acm', '/finance/adm-voucher', '/finance/acm-voucher'], api: ['/api/adm-memos'] },
      { name: 'Recurring vouchers / Multi-currency voucher / Print-preview & Comments demos', status: 'stub', modules: ['vouchers'], remark: 'Either build for real (recurring: template collection + scheduler that POSTs /api/vouchers; multi-currency: post both legs with forex rates) or remove the menu routes — today the buttons only mutate local state.', routes: ['/accounting/recurring', '/finance/multi-currency', '/finance/print-preview', '/finance/comments-demo'], note: 'VERIFIED 2026-07-08: all local-state demos. Recurring seeds RECURRING_DATA=[] and "Post" mutates local state only (never calls /api/vouchers); Multi-currency is a forex calc demo; Print-preview "Save & Post" has no onClick.' },
    ],
  },
  {
    area: 'CRM ↔ ERP Integration',
    items: [
      { name: 'CRM → ERP voucher push (SALE per TaxInvoice + PURCHASE per Supplier)', status: 'dormant', modules: ['crm'], remark: 'Intentional — no dev work pending. When the booking bridge ships, either delete the voucherPush machinery or deliberately re-enable PUSH_ENABLED.', note: 'HARD OFF since 2026-07: booksClient.js PUSH_ENABLED=false. Machinery (CRI/LK numbering, voucherPush) intact but dormant — bookings entered directly in ERP instead.' },
      { name: 'CRM ledger-create sync', status: 'stub', modules: ['crm', 'ledgers'], remark: 'Implement on the CRM side: on ledger create, POST /api/ledgers (shared DB), or accept ERP-only ledger creation and delete the stub.', note: 'Still a stub on the CRM side — ledger creation does not sync.' },
      { name: 'CRM → ERP booking bridge (Book Offline / Book Interbranch at confirmation)', status: 'pending', modules: ['crm', 'booking-orders', 'inter-branch-voucher'], remark: 'Implement per the approved 2026-07-03 design (Book Offline grid + Book Interbranch form at confirmation-save, Pending until ERP approval). Use the new externalRef dedupe on POST /api/inter-branch; bookingTotals GST parity + packageType are the hard gates.', note: 'Design APPROVED 2026-07-03: push at confirmation-save as Pending, CRM edits sync while pending, locked after ERP approval. bookingTotals parity + packageType are hard gates. Implementation status: verify in CRM repo.' },
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
      { name: 'Report tools (Custom Builder, Saved Views, Scheduled Email, Meta demo)', status: 'stub', modules: ['accounting'], remark: 'Needs a backend: saved-views collection, a report-builder query engine, and a scheduler job (nodemailer) for emailed reports. Until built, hide /reports/builder, /reports/saved-views, /reports/scheduled via Page Visibility.', routes: ['/reports/builder', '/reports/saved-views', '/reports/scheduled', '/reports/meta-demo'], note: 'VERIFIED 2026-07-08: builder/saved-views/scheduled all render <NotWired/>; legacy impls are dead code on empty seed constants. Only backend cron is the TK daily digest — there is NO report scheduler.' },
      { name: 'Legacy reports in finance.jsx / 6 deleted dead reports', status: 'stub', modules: ['accounting'], remark: 'Dead code — delete the legacy report components from finance.jsx (nothing routes to them), then close this item.', note: 'finance.jsx legacy report components are dead code; 6 legacy reports already deleted. Don\'t wire new links to them.' },
    ],
  },
  {
    area: 'Dashboards',
    items: [
      { name: 'Dashboard KPIs (module-pl + ageing)', status: 'live', modules: [], routes: ['/dashboard'], api: ['/api/module-pl'], note: 'Defaults range:"all" scope:"ALL"; FY-aligned "quarter" added. Voucher/journal dates MUST be ISO or every period filter returns 0 (`npm run normalize:dates`).' },
      { name: 'FY targets / heatmap / alerts / bank-cash widgets', status: 'live', modules: ['sales-targets'], routes: ['/dashboard'], note: 'VERIFIED 2026-07-08 (registry was stale): FY targets render liveTargets; heatmap via GET /api/accounting/branch-heatmap; Approvals tile is a LIVE pending count (useVoucherApprovals / pending-bookings), no longer hardcoded 0; bank/cash intentionally lives on the Owner Dashboard.' },
      { name: 'Owner Dashboard + AD Cockpit', status: 'live', modules: [], routes: ['/dashboard/owner', '/dashboard/cockpit'], note: 'Email-gated: Super Admin + afshin.dhanani@kingsgroupco.com only (isOwnerDashboardUser).' },
      { name: 'Director dashboards suite (18 boards)', status: 'partial', modules: ['sales-targets', 'budgets'], remark: 'Financial boards are live. Target/budget boards need /api/sales-targets data maintained (TK Targets page) — wire a targets-entry workflow or hide those boards until targets exist.', routes: ['/dashboards/exec', '/dashboards/profitability', '/dashboards/cash'], note: 'Financial boards pull live accounting; target/budget boards depend on targets data being maintained.' },
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
      { name: 'E-Invoice / E-Way Bill / GSP-IRP integration', status: 'stub', modules: ['app-config', 'tax-reconciliation'], remark: 'Requires a GSP/IRP provider contract: credentials in /settings/gsp-irp, IRN generation API for e-invoice, e-way JSON payloads. Also wire EINV rows from live gp-bills. Blocked on the external provider, not code alone.', routes: ['/tax/einvoice', '/tax/eway', '/settings/gsp-irp'], note: 'VERIFIED 2026-07-08: EINV_D=[] (TODO taxation/legacy.jsx); e-way rows hardcoded useState; Generate buttons only open a local modal. No GSP/IRP fetch anywhere — needs provider integration to file for real.' },
      { name: 'GSTR-9C / Tax Audit 3CD / Form 26AS / Form 16A', status: 'stub', modules: ['tax-reconciliation'], remark: 'Compute from live books: GSTR-9C from GSTR data + Trial Balance, 3CD clauses from ledgers, 26AS/16A from the TDS ledger postings. Until built, park these routes behind Page Visibility so users don\'t trust sample data.', routes: ['/tax/gstr9c', '/tax/audit-3cd', '/tax/form26as', '/tax/form-16a'], note: 'VERIFIED 2026-07-08: all four are stubs — hardcoded sample arrays with SampleBanner (GSTR-9C/3CD), Form 26AS is TWENTYSIX_DATA=[], Form 16A maps static FORM16A_DATA with inert Download/Email buttons. No backend routes.' },
    ],
  },
  {
    area: 'Reconciliation & Period Close',
    items: [
      { name: 'Bank / Supplier / Client reconciliation (statement import + match)', status: 'live', modules: ['bank-reconciliation', 'supplier-reconciliation', 'client-reconciliation'], routes: ['/bank-reco', '/accounts/supplier-reco', '/accounts/client-reco'], api: ['/api/bank-reconciliation', '/api/supplier-reconciliation', '/api/client-reconciliation'] },
      { name: 'Inter-branch + Tally reconciliation', status: 'live', modules: ['interbranch-reconciliation', 'tally-reconciliation'], routes: ['/accounts/interbranch-reco', '/accounts/tally-reco'], api: ['/api/interbranch-reconciliation', '/api/tally-reconciliation'] },
      { name: 'Recon status tracker (per-month manual sign-off)', status: 'live', modules: ['recon-status'], routes: ['/finance/recon-status'], api: ['/api/recon-status'], note: 'Control Tower gates on it.' },
      { name: 'PDC register + bounce workflow', status: 'live', modules: ['pdc-register'], api: ['/api/pdc'] },
      { name: 'Month-end checklist / Suspense clearing / Year-end close', status: 'partial', modules: ['fiscal-years', 'recon-status'], remark: 'Build a closing-entry endpoint (P&L → Retained Earnings per FY, idempotent), wire the Year-End screen to it, and lock the closed FY via /api/tk/period-locks. Month-end + suspense need nothing.', routes: ['/accounts/month-end', '/accounts/suspense', '/accounting/year-close'], note: 'Month-end + suspense are live workspaces. Year-End Close VERIFIED STUB 2026-07-08: steps/entries hardcoded, "lock" is a toast, no closing-entry endpoint (backend fiscal-years is period-definition CRUD only).' },
      { name: 'FX revaluation / Intercompany billing', status: 'stub', modules: ['forex-rates', 'interbranch-reconciliation'], remark: 'FX: build a revaluation endpoint that reads /api/accounting/fx-exposure and posts the JV, then wire the dead "Post Revaluation JV" button. Intercompany: the INB module already covers this — retire the screen or route it to /bookings/inter-branch.', routes: ['/accounting/fx-revaluation', '/accounting/intercompany'], note: 'VERIFIED 2026-07-08: neither posts journals. FX reval reads FX_REVAL_DATA=[] and "Post Revaluation JV" has NO onClick (backend exposes read-only fx-exposure only); Intercompany renders <NotWired/>.' },
    ],
  },
  {
    area: 'Masters & Data Import',
    items: [
      { name: 'Live masters suite (Voucher Types, Cost Categories, Budgets, Scenarios, Customers, Suppliers, Credit Facilities)', status: 'live', modules: ['voucher-types', 'cost-categories', 'budgets', 'scenarios', 'customers', 'suppliers', 'credit-facilities'], routes: ['/masters/voucher-types', '/masters/customers', '/masters/suppliers', '/masters/credit-facilities'], api: ['/api/voucher-types', '/api/cost-categories', '/api/budgets', '/api/scenarios', '/api/credit-facilities'] },
      { name: 'Cost Centres (seeded, Super-Admin writes)', status: 'live', modules: ['cost-centers'], routes: ['/masters/cost-centers'], api: ['/api/cost-centers'], note: 'Branch Accountant writes 403 (view allowed).' },
      { name: 'Data Import (vouchers, accounts, masters)', status: 'live', modules: ['import'], routes: ['/import'], api: ['/api/import'], note: 'Coerces date→ISO + branch→UPPERCASE (shared/utils/dates.js). Parties UPSERT chart ledgers. Non-ISO legacy rows: `npm run normalize:dates`.' },
      { name: 'Branch reference data', status: 'partial', modules: ['branches'], remark: 'Run `npm run seed:branches` on prod (idempotent) and verify branch names/currencies/TKHO. NEVER `npm run seed` (drops the shared DB) or `migrate:reference` (resets numbering).', api: ['/api/branches'], note: 'Prod branch docs were stale (code-only → "undefined"/INR). Fix with idempotent `npm run seed:branches` — NOT `seed` (drops db), NOT `migrate:reference` (resets numbering).' },
      { name: 'Travel inventory masters (Airlines, Hotels, Seats, Tour Codes, Markup)', status: 'partial', modules: ['tour-codes'], remark: 'Add backend features (buildCrudRouter) for airlines/hotels/seats/markup and wire the screens exactly like tour-codes.jsx. Markup rules ALSO need a consumer in booking pricing before they do anything.', routes: ['/masters/airlines', '/masters/hotels', '/masters/seats', '/masters/tour-codes', '/masters/markup'], note: 'VERIFIED 2026-07-08: only Tour Codes is LIVE (/api/tour-codes). Airlines/Hotels = empty arrays with save-less modals; Seats = hardcoded sample; Markup = local useState AND rules are consumed nowhere in pricing/voucher code. No backend feature for any of the four.' },
      { name: 'Numbering series / Forex rates / Bank accounts', status: 'live', modules: ['numbering-series', 'forex-rates'], routes: ['/masters/numbering', '/masters/forex', '/masters/bank-accounts'], api: ['/api/numbering-series', '/api/forex-rates'] },
      { name: 'Vendor Credit Terms screen', status: 'stub', modules: ['suppliers'], remark: 'Wire /masters/vendor-terms to the supplier master\'s creditDays/creditLimit/settlementCycle/paymentMethod (fields already exist on erpsuppliers) or retire the menu route — the Task List judges supplier credit terms on the master itself.', routes: ['/masters/vendor-terms'], note: 'Screen does not persist; the supplier credit fields are editable on /masters/suppliers, so this page is redundant until wired.' },
      { name: 'Bank-ledger detail backfill (bankName / bankAcNo / bankIfsc)', status: 'pending', modules: ['ledgers'], remark: 'DB script: parse the account number already embedded in each wired bank head\'s NAME (e.g. "HDFC Bank [A/c. No.5020…]") into the structured bankAcNo field + collect IFSC from the branches; wired heads are DB-only, so this is a developer job, not a screen task.', routes: ['/masters/bank-accounts'], note: 'VERIFIED 2026-07-10: all 42 bank/OD ledgers (locked wired heads) have EMPTY structured bankName/bankAcNo/bankIfsc fields — the details live only inside the ledger name text, so nothing downstream can print or match on them reliably.' },
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
      { name: 'Payroll runs / payslips / salary revision / employee loans', status: 'partial', modules: ['hr'], remark: 'Build a backend payroll engine: per-employee register lines with config-driven PF/ESI/PT/TDS rates, persisted lines + a payslip collection; keep the FE as renderer. Today\'s client-side math is display-only and vanishes on refresh.', routes: ['/hr/payroll', '/hr/payslips', '/hr/salary-revision', '/hr/loans-advances'], api: ['/api/payroll-runs', '/api/salary-revisions', '/api/employee-loans'], note: 'VERIFIED 2026-07-08: salary revisions + loans LIVE; payroll run HEADERS persist to /api/payroll-runs but per-employee PF/ESI/PT/TDS register lines are computed inline client-side and NEVER stored; payslips computed on the fly (no collection). NO statutory payroll engine anywhere (rates hardcoded in 3 UI components).' },
      { name: 'Recruitment / gratuity / PF-ESI challan', status: 'partial', modules: ['hr'], remark: 'Persist PF-ESI challan payment records (BSR/TRN/date/status — extend payroll-runs or add a challans collection); "Mark Paid" is local-only today. Gratuity: persist the provision if it must hit the books, else label it view-only.', routes: ['/hr/recruitment', '/hr/gratuity', '/hr/pf-esi'], api: ['/api/job-openings'], note: 'VERIFIED 2026-07-08: Recruitment LIVE (/api/job-openings). Gratuity reads live employees but provision is client-side view-only. PF-ESI challan computes from live employees but "Mark Paid" (BSR/TRN/status) is local useState — nothing persists.' },
      { name: 'Self-service (portal, leave apply, reimbursement, my payslip, Form 16, 360°, skills)', status: 'stub', modules: ['hr', 'employees'], remark: 'Scope every screen to the logged-in user (whoami → employee record), wire leave-apply to /api/leave-requests and my-payslip to the payroll data. DO NOT expose to staff before auth scoping — today it shows one fixed demo employee.', routes: ['/hr/portal', '/hr/leave-apply', '/hr/my-payslip', '/hr/form-16'], note: 'VERIFIED 2026-07-08: static fixed employee, submits only set local state, no API. NO per-employee auth scoping (getAuthToken imported but never used to scope) — must not be exposed to staff as-is.' },
      { name: 'HR org masters — Departments, Designations, Grades', status: 'pending', modules: ['hr', 'employees'], remark: 'Build the three masters (buildCrudRouter, branch-agnostic) and turn the employee form\'s free-text designation/department into selects; grades drive salary bands. Then FM fills them from the Task List.', routes: ['/hr/employees'], note: 'No collections exist anywhere — designation/department are free-text on the employee record, so HR reporting can never group them reliably.' },
      { name: 'Public-holiday calendar master', status: 'pending', modules: ['hr', 'attendance'], remark: 'Add a branch-scoped, year-wise holiday master + auto-mark H in the attendance grid (weekly-offs from the shift master already work). Then FM enters each branch\'s holiday list yearly.', routes: ['/hr/attendance'], note: 'Attendance only knows weekly-offs from shifts — festival/public holidays are hand-marked cell by cell every month.' },
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
      { name: 'Admin Power pages (doc/email templates, approval matrix, custom fields, field access, permissions matrix, branding, bulk users)', status: 'partial', modules: ['email-templates', 'custom-fields', 'field-access', 'approval-limits'], remark: 'Persistence is wired (2026-07-08). Remaining: build the CONSUMERS — an email send pipeline that uses the templates, master forms that render custom-fields, field-access enforcement middleware, and approval-matrix writes to /api/approval-limits.', routes: ['/settings/doc-templates', '/settings/email-templates', '/settings/approval-matrix-builder', '/settings/custom-fields', '/settings/field-access', '/settings/permissions-matrix', '/settings/branding', '/settings/bulk-users'], api: ['/api/email-templates', '/api/custom-fields', '/api/field-access', '/api/document-types'], note: 'PERSISTENCE WIRED 2026-07-08: email-templates (save/new), custom-fields (add/edit/toggle modal), field-access (dirty-tracked save) now write their CRUD APIs; bulk-users Activate/Deactivate/Change-Role hit PUT /api/auth/users/:id (bootstrap fallback accounts skipped). Doc-templates, branding, approval-matrix-builder, permissions-matrix save buttons are honestly DISABLED (preview-only, no backing store). REMAINING GAP: saved config is still consumed/ENFORCED nowhere — no send pipeline for templates, custom fields don\'t drive master forms, field-access has no enforcement middleware.' },
      { name: 'Banking API / GSP-IRP integration settings', status: 'stub', modules: ['app-config'], remark: 'Blocked on external provider contracts (bank feeds, GSP). Keep the forms disabled until credentials exist; then wire the settings to a real integration layer.', routes: ['/settings/banking-api', '/settings/gsp-irp'], note: 'Settings forms only — no live provider integration behind them.' },
      { name: 'Period locking (settings)', status: 'live', modules: ['tk-group'], routes: ['/settings/period-lock'], note: 'FIXED 2026-07-08: the dead second lock UI (empty data, inert buttons) was retired — /settings/period-lock now renders the real TK period-lock admin (TkPeriodLockPage → /api/tk/period-locks, policyGuard). Same page as /tk/period-locks.' },
      { name: 'Developer Control Tower (this console)', status: 'live', modules: [], routes: ['/dev/control'], api: ['/api/dev-control'], note: 'Super-Admin-only. Findings board mirrors TK Control Tower finding-status; per-item owner/status/due/note persisted in DevItemStatus. Definitions hand-maintained in this registry file.' },
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
    const open = a.items.filter((i) => !isCleared(i, trackMap[i.id]));
    const verdict = open.some((i) => i.status === 'stub' || i.status === 'pending') ? 'broken' : open.length ? 'gaps' : 'working';
    return { area: a.area, total: a.items.length, cleared: a.items.length - open.length, open, verdict };
  }).sort((x, y) => (VERDICT_ORDER[x.verdict] - VERDICT_ORDER[y.verdict]) || (y.open.length - x.open.length));
}

/* ── Open dev findings by module — feeds the Setup-Readiness module map ──
   moduleId (backend tk-group/moduleRegistry.js) → the OPEN dev items mapped to
   it via each item's `modules`. Same clearing rule as everywhere (isCleared),
   so fixing an item in Dev Control clears it off the module map too. An item
   with status 'dormant' is intentional (switched off), not a dev need — the
   consumer decides how to render it. */
export function openDevByModule(trackMap = {}) {
  const by = {};
  ALL_ITEMS.forEach((item) => {
    if (isCleared(item, trackMap[item.id])) return;
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
  'FX revaluation "Post Revaluation JV" and Year-End Close post NOTHING — live-looking screens, zero DB writes.',
  'HR PF-ESI challan "Mark Paid" and payroll register PF/ESI/PT/TDS lines are client-side only — challan payment records and payslip lines are never persisted.',
  'Sales segments in Sales & GP Analytics are derived by regex on voucher.partyGroup — renaming party groups silently reclassifies history.',
  'Never raw status-flip a posted voucher — always unpostLeg (see the 2026-07-02 INB revert batch: un-post refund BEFORE its INB sale).',
  'TKHO branch chart is stale after the branch-chart replication run.',
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
];
