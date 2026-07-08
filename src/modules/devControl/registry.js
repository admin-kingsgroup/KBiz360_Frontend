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
      { name: '28-group Tally double-entry engine', status: 'live', api: ['/api/accounting'], note: 'posting.builder + universal pending gate. Every posted voucher writes balanced DR/CR journals.' },
      { name: 'Trial Balance (Opening/Debit/Credit/Closing)', status: 'live', routes: ['/finance/trial-balance', '/trial-balance'], api: ['/api/accounting'], note: 'Backend restart required after trialBalance controller changes.' },
      { name: 'Day Book / Cash Book / Ledger A/c (live)', status: 'live', routes: ['/day-book', '/finance/cash-book', '/ledger'], note: 'From–To defaults today; views + search + pagination + export. Legacy CashBookReport in finance.jsx is DEAD code.' },
      { name: 'P&L + Balance Sheet (unified, Tally, Schedule III)', status: 'live', routes: ['/reports/pnl', '/reports/bs', '/reports/pnl-tally', '/reports/bs-tally', '/reports/schedule3-bs'], note: 'Audited: TB/BS balance, A=L+E, BS "P&L A/c" ties to Tally P&L exactly (modulePL excludes only Sales/Purchase Accounts from indirect).' },
      { name: 'P&L period system (YTD default, matrix, compare)', status: 'live', routes: ['/reports/pnl'], note: 'Indirect expenses split Fixed/Variable via Group.expenseType — classify with `npm run seed:expense-types`, then restart backend.' },
      { name: 'Notes to Financial Statements', status: 'live', routes: ['/reports/fs-notes'], note: 'Frontend-computed from BS/P&L/TB/ageing (notesEngine.js) — reconciles by construction.' },
      { name: 'Groups / Ledgers masters (DB-backed CoA)', status: 'live', routes: ['/masters/groups', '/masters/ledgers', '/masters/accounts-tree'], api: ['/api/groups', '/api/subgroups', '/api/ledgers'], note: '28 Tally groups seeded + locked; custom groups/sub-groups editable. OPEN ITEM: Sales/Purchase ledgers are still edit-only in places.' },
      { name: 'Branch chart replication (shared-chart model)', status: 'partial', api: ['/api/ledgers'], note: 'BOM skeleton cloned to AMD/NBO/DAR/FBM/BOMMB in branch currency (GST vs VAT+WHT). TKHO is STALE. Re-run `npm run seed:branch-charts`; frontend Replicate modal was removed.' },
      { name: 'Dynamic CoA — infinite nesting + recursive rollup', status: 'pending', note: 'Approved plan: evolve the JS engine (not greenfield TS). Design doc: docs/dynamic-chart-of-accounts.md.' },
      { name: 'Module cost centres / module-wise GP', status: 'partial', api: ['/api/module-pl', '/api/cost-centers'], note: 'Seeded cost-centre driven. GAP: CRM push does not stamp voucher.costCenter (Flight / Holiday Intl-vs-Dom) → those land in "Unspecified".' },
    ],
  },
  {
    area: 'Vouchers & Transactions',
    items: [
      { name: '7 finance vouchers (Receipt/Payment/Contra/Journal/PXP/Debit Note/…)', status: 'live', routes: ['/receipts', '/payments', '/contra', '/journal', '/purchase-expense', '/debit-note'], api: ['/api/vouchers'], note: 'Rebuilt to Travkings HTML spec. Receipt/Payment have bill-wise allocation + On-Account via GET /api/vouchers/open-bills. Debit Note = supplier purchase-return.' },
      { name: 'SO/PO/GP booking (one screen → linked locked Sale+Purchase)', status: 'live', routes: ['/bookings/new'], api: ['/api/booking-orders'], note: 'Approve spawns locked vouchers via internal source:"booking" (unspoofable). GP math includes incentive. bookingTotals GST parity is the hard gate.' },
      { name: 'Inter-Branch (INB) vouchers + Link registry', status: 'live', routes: ['/bookings/inter-branch', '/accounts/inb-register', '/accounts/inb-matrix', '/accounts/inb-counterparty'], api: ['/api/inter-branch'], note: 'Seller-side locked legs, Approve posts/Push hands to buyer + auto-seeds buyer booking. POST /api/inter-branch is CRM-ready but has NO dedupe field yet.' },
      { name: 'Refund / Reissue (RF/RI against a sales invoice)', status: 'live', routes: ['/finance/refund', '/finance/reissue', '/finance/refund-partial'], note: 'SO/PO/GP reversal modules; balanced DR/CR + counterParty/supplierAmt second leg. Standalone RefundVoucher/ReissueVoucher screens are retired.' },
      { name: 'TCS / TDS auto-posting to own ledgers', status: 'live', note: 'TCS: sale→Payable, purchase→Receivable. TDS is Journal-only EXCEPT on supplier incentive. Seed via `npm run seed:tax-ledgers`.' },
      { name: 'Supplier incentive / commission income', status: 'live', note: 'Auto GST(output) + TDS on the incentive base only; flows to invoice/module GP, P&L, BS. Backfill: `npm run backfill:incentives`.' },
      { name: '3-level approval chain (Check → Verify → Approve)', status: 'partial', routes: ['/transactions/voucher-approvals'], note: 'Applies to CRM-created entries ONLY (createdBy crm:*/crm-service). ERP-entered/legacy = old single-step Approve. Assignees in app-config; Super-Admin override exists.' },
      { name: 'Bill-wise settlement + overpaid visibility', status: 'live', note: 'useOpenBills defaults includeOverpaid — over-settled bills render as orange non-allocatable credit rows everywhere, never netted into dues.' },
      { name: 'ADM/ACM memos (BSP debit/credit) → gated voucher', status: 'live', routes: ['/purchase/adm', '/purchase/acm', '/finance/adm-voucher', '/finance/acm-voucher'], api: ['/api/adm-memos'] },
      { name: 'Recurring vouchers / Multi-currency voucher / Print-preview & Comments demos', status: 'stub', routes: ['/accounting/recurring', '/finance/multi-currency', '/finance/print-preview', '/finance/comments-demo'], note: 'Demo/prototype entry helpers — verify before relying on them.' },
    ],
  },
  {
    area: 'CRM ↔ ERP Integration',
    items: [
      { name: 'CRM → ERP voucher push (SALE per TaxInvoice + PURCHASE per Supplier)', status: 'dormant', note: 'HARD OFF since 2026-07: booksClient.js PUSH_ENABLED=false. Machinery (CRI/LK numbering, voucherPush) intact but dormant — bookings entered directly in ERP instead.' },
      { name: 'CRM ledger-create sync', status: 'stub', note: 'Still a stub on the CRM side — ledger creation does not sync.' },
      { name: 'CRM → ERP booking bridge (Book Offline / Book Interbranch at confirmation)', status: 'pending', note: 'Design APPROVED 2026-07-03: push at confirmation-save as Pending, CRM edits sync while pending, locked after ERP approval. bookingTotals parity + packageType are hard gates. Implementation status: verify in CRM repo.' },
      { name: 'Payment Verification inbox (CRM payments → finance verify/reject)', status: 'live', routes: ['/accounts/payment-verification'], note: 'Drives the CRM\'s own endpoints via shared-JWT SSO.' },
      { name: 'ERP ledger reads from CRM (erp-ledgers)', status: 'live', note: 'CRM reads ERP chart via shared DB — still live even with push disabled.' },
      { name: 'Cross-app user access + per-app session floors', status: 'live', routes: ['/settings/users'], api: ['/api/user-access'], note: 'access.{crm,erp,app} on shared users; PER-APP single-device floors (crmLoginAt/erpLoginAt) since 2026-07-03; passwordChangedAt stays global.' },
      { name: 'CRM read-only bridge (sales-tickets + purchases)', status: 'live', api: ['/api/crm'] },
    ],
  },
  {
    area: 'Reports & Analytics',
    items: [
      { name: 'Profitability reports (GP, yield, LTV, ABC, YoY)', status: 'live', routes: ['/reports/gp', '/reports/yield-destination', '/reports/customer-ltv', '/reports/abc-analysis', '/reports/yoy'], api: ['/api/accounting'], note: 'All pull live gp-bills via useGpBills. TRAP: static seed arrays in core/data.js (GP_BILLS, PKG_D, …) are [] — any screen still reading them renders blank.' },
      { name: 'Sales & GP Analytics + Inter-Branch reports', status: 'live', routes: ['/reports/sales-gp-analytics'], note: '5 sales segments derived by REGEX on voucher.partyGroup (no segment field). Cost paired by linkNo. Reconciles with Invoice-GP / P&L.' },
      { name: 'Financial statement suite (CF, MIS, Consolidated, Ratio, Branch)', status: 'live', routes: ['/reports/cf', '/reports/mis', '/reports/consolidated-bs', '/reports/ratios', '/reports/branch'], note: 'From live double-entry. seed.js fabricates a ₹3.35Cr BS — `npm run cleanup:demo` removes demo data (dry-run first, never drops db).' },
      { name: 'ReportDateBar / PeriodBar standard filter', status: 'live', note: 'Monthly/Quarterly/YTD/All + back-dated From/To + YoY. Default "all". There is NO useDateRange symbol in this app — don\'t import it.' },
      { name: 'Report tools (Custom Builder, Saved Views, Scheduled Email, Meta demo)', status: 'stub', routes: ['/reports/builder', '/reports/saved-views', '/reports/scheduled', '/reports/meta-demo'], note: 'Prototype screens — no backend delivery pipeline (no email scheduler job).' },
      { name: 'Legacy reports in finance.jsx / 6 deleted dead reports', status: 'stub', note: 'finance.jsx legacy report components are dead code; 6 legacy reports already deleted. Don\'t wire new links to them.' },
    ],
  },
  {
    area: 'Dashboards',
    items: [
      { name: 'Dashboard KPIs (module-pl + ageing)', status: 'live', routes: ['/dashboard'], api: ['/api/module-pl'], note: 'Defaults range:"all" scope:"ALL"; FY-aligned "quarter" added. Voucher/journal dates MUST be ISO or every period filter returns 0 (`npm run normalize:dates`).' },
      { name: 'FY targets / heatmap / alerts / bank-cash widgets', status: 'stub', routes: ['/dashboard'], note: 'Still Phase-2 seed data. Approvals tile is HARDCODED 0.' },
      { name: 'Owner Dashboard + AD Cockpit', status: 'live', routes: ['/dashboard/owner', '/dashboard/cockpit'], note: 'Email-gated: Super Admin + afshin.dhanani@kingsgroupco.com only (isOwnerDashboardUser).' },
      { name: 'Director dashboards suite (18 boards)', status: 'partial', routes: ['/dashboards/exec', '/dashboards/profitability', '/dashboards/cash'], note: 'Financial boards pull live accounting; target/budget boards depend on targets data being maintained.' },
      { name: 'Alerts dashboard + alert states', status: 'live', routes: ['/dashboard/alerts'], api: ['/api/alerts', '/api/alert-states'] },
    ],
  },
  {
    area: 'Taxation',
    items: [
      { name: 'Per-branch tax regime (GST India / VAT+WHT Africa)', status: 'live', note: 'taxRegime on branch drives menus (TAX_INDIA/TAX_AFRICA/TAX_ALL) and posting. India: BOMMB/BOM/AMD. Africa: NBO/DAR/FBM.' },
      { name: 'GST screens on live GP bills (GSTR-1/3B views)', status: 'live', routes: ['/tax/gstr1', '/tax/gstr3b'], note: 'Wired to live useGpBills (previously read empty GP_BILLS seed).' },
      { name: 'GSTR-2B import + ITC matching', status: 'live', routes: ['/tax/gstr2b-itc'], api: ['/api/gstr2b'], note: 'Control Tower gates on unmatched input credit.' },
      { name: 'Tax reconciliation (3B/VAT vs books, 1 vs 3B, TDS vs 26AS)', status: 'live', routes: ['/tax/reconciliation'], api: ['/api/tax-reconciliation'] },
      { name: 'E-Invoice / E-Way Bill / GSP-IRP integration', status: 'stub', routes: ['/tax/einvoice', '/tax/eway', '/settings/gsp-irp'], note: 'UI exists; no live GSP/IRP credentials or API calls — needs provider integration to file for real.' },
      { name: 'GSTR-9C / Tax Audit 3CD / Form 26AS / Form 16A', status: 'audit', routes: ['/tax/gstr9c', '/tax/audit-3cd', '/tax/form26as', '/tax/form-16a'], note: 'Screens render; confirm whether they compute from live books or demo data.' },
    ],
  },
  {
    area: 'Reconciliation & Period Close',
    items: [
      { name: 'Bank / Supplier / Client reconciliation (statement import + match)', status: 'live', routes: ['/bank-reco', '/accounts/supplier-reco', '/accounts/client-reco'], api: ['/api/bank-reconciliation', '/api/supplier-reconciliation', '/api/client-reconciliation'] },
      { name: 'Inter-branch + Tally reconciliation', status: 'live', routes: ['/accounts/interbranch-reco', '/accounts/tally-reco'], api: ['/api/interbranch-reconciliation', '/api/tally-reconciliation'] },
      { name: 'Recon status tracker (per-month manual sign-off)', status: 'live', routes: ['/finance/recon-status'], api: ['/api/recon-status'], note: 'Control Tower gates on it.' },
      { name: 'PDC register + bounce workflow', status: 'live', api: ['/api/pdc'] },
      { name: 'Month-end checklist / Suspense clearing / Year-end close', status: 'partial', routes: ['/accounts/month-end', '/accounts/suspense', '/accounting/year-close'], note: 'Month-end + suspense are live workspaces; Year-End Close needs verification of actual closing-entry posting.' },
      { name: 'FX revaluation / Intercompany billing', status: 'audit', routes: ['/accounting/fx-revaluation', '/accounting/intercompany'], note: 'Confirm whether these post real journals or are demo screens.' },
    ],
  },
  {
    area: 'Masters & Data Import',
    items: [
      { name: 'Live masters suite (Voucher Types, Cost Categories, Budgets, Scenarios, Customers, Suppliers, Credit Facilities)', status: 'live', routes: ['/masters/voucher-types', '/masters/customers', '/masters/suppliers', '/masters/credit-facilities'], api: ['/api/voucher-types', '/api/cost-categories', '/api/budgets', '/api/scenarios', '/api/credit-facilities'] },
      { name: 'Cost Centres (seeded, Super-Admin writes)', status: 'live', routes: ['/masters/cost-centers'], api: ['/api/cost-centers'], note: 'Branch Accountant writes 403 (view allowed).' },
      { name: 'Data Import (vouchers, accounts, masters)', status: 'live', routes: ['/import'], api: ['/api/import'], note: 'Coerces date→ISO + branch→UPPERCASE (shared/utils/dates.js). Parties UPSERT chart ledgers. Non-ISO legacy rows: `npm run normalize:dates`.' },
      { name: 'Branch reference data', status: 'partial', api: ['/api/branches'], note: 'Prod branch docs were stale (code-only → "undefined"/INR). Fix with idempotent `npm run seed:branches` — NOT `seed` (drops db), NOT `migrate:reference` (resets numbering).' },
      { name: 'Travel inventory masters (Airlines, Hotels, Seats, Tour Codes, Markup)', status: 'audit', routes: ['/masters/airlines', '/masters/hotels', '/masters/seats', '/masters/tour-codes', '/masters/markup'], note: 'Tour codes / projects / sub-agents have backend routes; airlines/hotels/seats likely still seed-data screens — confirm.' },
      { name: 'Numbering series / Forex rates / Bank accounts', status: 'live', routes: ['/masters/numbering', '/masters/forex', '/masters/bank-accounts'], api: ['/api/numbering-series', '/api/forex-rates'] },
    ],
  },
  {
    area: 'TK Group (Central Governance)',
    items: [
      { name: 'TK Group control layer (flags, change-requests, inbox, decisions, limits, period locks)', status: 'dormant', routes: ['/tk/control-panel', '/tk/controls', '/tk/approvals', '/tk/decisions'], api: ['/api/tk/flags', '/api/tk/change-requests', '/api/tk/inbox', '/api/tk/decisions', '/api/tk/limits', '/api/tk/period-locks'], note: 'REAL backend, dormant-safe by design: every page shows empty/read-only until core.policy_guard flag is switched on at go-live.' },
      { name: 'Control Tower / Branch Cockpit / monitoring rules', status: 'live', routes: ['/tk/control-tower', '/tk/branch-cockpit', '/tk/rules'], api: ['/api/tk/monitor', '/api/tk/rules', '/api/tk/finding-status'], note: 'Rules Manager is OWNER-only.' },
      { name: 'HO Control pill (authority config, vendor lock, audit queue…)', status: 'stub', routes: ['/ho/group-dashboard', '/settings/authority-config', '/ho/audit-queue'], note: 'STATIC PROTOTYPE (per menus.js) — distinct from the real /api/tk/* surfaces. Do not confuse the two.' },
    ],
  },
  {
    area: 'HR & Payroll',
    items: [
      { name: 'Employee master / attendance / shifts / leave', status: 'partial', routes: ['/hr/employees', '/hr/attendance', '/hr/shifts', '/hr/leave'], api: ['/api/employees', '/api/attendance', '/api/shifts', '/api/leave-requests', '/api/leave-balances'], note: 'Backend routes exist; verify each screen actually persists (some HR screens predate the APIs).' },
      { name: 'Payroll runs / payslips / salary revision / employee loans', status: 'partial', routes: ['/hr/payroll', '/hr/payslips', '/hr/salary-revision', '/hr/loans-advances'], api: ['/api/payroll-runs', '/api/salary-revisions', '/api/employee-loans'], note: 'Run-status APIs exist; NO statutory payroll engine (PF/ESI/PT/TDS computation) — challan screens are forms, not calculators.' },
      { name: 'Recruitment / gratuity / PF-ESI challan', status: 'audit', routes: ['/hr/recruitment', '/hr/gratuity', '/hr/pf-esi'], api: ['/api/job-openings'] },
      { name: 'Self-service (portal, leave apply, reimbursement, my payslip, Form 16, 360°, skills)', status: 'stub', routes: ['/hr/portal', '/hr/leave-apply', '/hr/my-payslip', '/hr/form-16'], note: 'Prototype self-service screens — no per-employee auth scoping wired.' },
    ],
  },
  {
    area: 'Settings, Access & Platform',
    items: [
      { name: 'Users & Roles + App Access tab', status: 'live', routes: ['/settings/users'], api: ['/api/user-access', '/api/roles'], note: 'Per-app login toggles enforced at each app\'s login + mid-session eviction; defaults true.' },
      { name: 'Page Visibility Control (per-user hidden/granted)', status: 'live', routes: ['/settings/page-access'], note: 'Email-gated admin (afshin + developer account). Catalogue auto-derived from menu trees + generated route manifest.' },
      { name: 'Branch scoping + full-scope roles + no-branch lockout', status: 'live', note: 'Full-scope roles expand ALL→live branches at login; user with no branch sees a notice, server also scopes every call.' },
      { name: 'Support tickets (in-app issue tracker)', status: 'live', routes: ['/support/tickets'], api: ['/api/support-tickets'] },
      { name: 'Audit log / export audit trail', status: 'live', routes: ['/settings/audit', '/reports/audit-trail'], api: ['/api/audit', '/api/export-audit'] },
      { name: 'Admin Power pages (doc/email templates, approval matrix, custom fields, field access, permissions matrix, branding, bulk users)', status: 'audit', routes: ['/settings/doc-templates', '/settings/email-templates', '/settings/approval-matrix-builder', '/settings/custom-fields', '/settings/field-access', '/settings/permissions-matrix', '/settings/branding', '/settings/bulk-users'], api: ['/api/email-templates', '/api/custom-fields', '/api/field-access', '/api/document-types'], note: 'Backend routes EXIST for templates/custom-fields/field-access — confirm each screen persists to them and that saved config is ENFORCED anywhere.' },
      { name: 'Banking API / GSP-IRP integration settings', status: 'stub', routes: ['/settings/banking-api', '/settings/gsp-irp'], note: 'Settings forms only — no live provider integration behind them.' },
      { name: 'Period locking (settings)', status: 'audit', routes: ['/settings/period-lock'], note: 'TK period locks (/api/tk/period-locks) are the real mechanism; confirm this settings screen isn\'t a second, unwired lock.' },
      { name: 'Developer Control Tower (this console)', status: 'live', routes: ['/dev/control'], api: ['/api/dev-control'], note: 'Super-Admin-only. Findings board mirrors TK Control Tower finding-status; per-item owner/status/due/note persisted in DevItemStatus. Definitions hand-maintained in this registry file.' },
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
  'POST /api/inter-branch has no dedupe/idempotency field yet — a CRM double-push would create duplicate INB legs.',
  'Approvals tile on the dashboard is hardcoded 0 (Phase-2).',
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
